export type UpriseUIAspectRatio = {
  label: string;
  value: number;
};

export type UpriseUICropData = {
  x: number;
  y: number;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  zoom: number;
  zoomLevel: number;
  aspectRatio: number;
};

export type UpriseUICropperOptions = {
  src?: string | File | Blob | null;
  aspectRatios?: UpriseUIAspectRatio[];
  initialAspectRatio?: number;
  showAspectRatioControl?: boolean;
  aspectRatioControlType?: 'buttons' | 'dropdown' | 'none' | false;
  aspectRatioControlSelector?: string;
  showSelectButton?: boolean;
  selectButtonSelector?: string;
  showZoom?: boolean;
  zoomSelector?: string;
  showImageInfo?: boolean;
  imageInfoSelector?: string;
  viewportCheckered?: boolean;
  viewportBackgroundColor?: string;
  viewportMaskColor?: string | null;
  borderRadius?: number;
  autoDarkMode?: boolean;
  forceDarkMode?: boolean;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
};

type Point = {
  x: number;
  y: number;
};

type Rect = {
  width: number;
  height: number;
  left: number;
  top: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  panX: number;
  panY: number;
} | null;

export class UpriseUICropper {
  static readonly MIN_VISIBLE_ZOOM = 0.1;

  root: HTMLElement;
  options: Required<Omit<UpriseUICropperOptions, 'src' | 'viewportMaskColor'>> & {
    src: string | File | Blob | null;
    viewportMaskColor: string | null;
  };
  aspectRatio: number;
  minZoom: number;
  maxZoom: number;
  zoom: number;
  zoomLevel: number;
  objectUrl: string | null = null;
  natural: { width: number; height: number };
  base: Rect;
  frame: Rect;
  pan: Point;
  drag: DragState;
  cropEndTimer: number = 0;
  cropStartTimer: number = 0;
  isCropInteracting: boolean = false;
  hasLoggedZoomSliderDisabled: boolean = false;
  hasAppliedInitialZoom: boolean = false;
  resizeObserver!: ResizeObserver;

  fileInput!: HTMLInputElement;
  viewport!: HTMLElement;
  image!: HTMLImageElement;
  frameEl!: HTMLElement;
  frameImage!: HTMLImageElement;
  ratioContainer!: HTMLElement | null;
  ratioButtons: HTMLElement[] = [];
  ratioSelect!: HTMLSelectElement | null;
  selectButton!: HTMLLabelElement;
  zoomInput!: HTMLInputElement;
  status!: HTMLOutputElement;

  constructor(root: HTMLElement, options: UpriseUICropperOptions = {}) {
    if (!root) throw new Error('UpriseUICropper requires a root element.');

    this.root = root;
    this.options = {
      src: '',
      aspectRatios: [
        { label: '1:1 Square', value: 1 },
        { label: '4:3 Standard', value: 4 / 3 },
        { label: '16:9 Landscape', value: 16 / 9 },
        { label: '9:16 Portrait', value: 9 / 16 },
        { label: '3:4 Portrait', value: 3 / 4 },
        { label: '2:3 Portrait', value: 2 / 3 }
      ],
      initialAspectRatio: 1,
      showAspectRatioControl: true,
      aspectRatioControlType: 'buttons',
      aspectRatioControlSelector: '',
      showSelectButton: true,
      selectButtonSelector: '',
      showZoom: true,
      zoomSelector: '',
      showImageInfo: true,
      imageInfoSelector: '',
      viewportCheckered: true,
      viewportBackgroundColor: 'transparent',
      viewportMaskColor: null,
      borderRadius: 0,
      autoDarkMode: true,
      forceDarkMode: false,
      initialZoom: 1,
      minZoom: 1,
      maxZoom: 5,
      ...options
    } as UpriseUICropper['options'];

    this.aspectRatio = this.options.initialAspectRatio;
    this.zoom = this.options.initialZoom;
    this.zoomLevel = 0;
    this.minZoom = 1;
    this.maxZoom = this.options.maxZoom;
    this.pan = { x: 0, y: 0 };
    this.natural = { width: 0, height: 0 };
    this.base = { width: 0, height: 0, left: 0, top: 0 };
    this.frame = { width: 0, height: 0, left: 0, top: 0 };
    this.drag = null;

    this.render();
    this.bind();
    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(this.viewport);

    if (this.options.src) this.setImage(this.options.src);
  }

  requiredElement<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`UpriseUICropper missing required element: ${selector}`);
    }
    return element;
  }

  render(): void {
    this.root.innerHTML = `
      <div class="uui-cropper__ratio-row" role="group" aria-label="Crop aspect ratio"></div>
      <div class="uui-cropper__layout">
        <div class="uui-cropper__viewport" aria-label="Image crop viewport">
          <img class="uui-cropper__image uui-cropper__image--source" alt="Image source for cropping" draggable="false" />
          <div class="uui-cropper__frame">
            <img class="uui-cropper__frame-image" alt="Visible crop area" draggable="false" />
            <span class="uui-cropper__grid-v"></span>
          </div>
        </div>
      </div>
      <div class="uui-cropper__controls">
        <label class="uui-cropper__select">
          Select
          <input class="uui-cropper__file" type="file" accept="image/*" />
        </label>
        <input class="uui-cropper__zoom" type="range" min="0" max="100" step="0.01" value="0" aria-label="Zoom" />
        <output class="uui-cropper__status">Image: 0 × 0px • Zoom: 100% • Crop: 0 × 0px</output>
      </div>
    `;

    this.viewport = this.requiredElement<HTMLElement>('.uui-cropper__viewport');
    this.image = this.requiredElement<HTMLImageElement>('.uui-cropper__image');
    this.frameImage = this.requiredElement<HTMLImageElement>('.uui-cropper__frame-image');
    this.frameEl = this.requiredElement<HTMLElement>('.uui-cropper__frame');
    this.status = this.requiredElement<HTMLOutputElement>('.uui-cropper__status');
    this.zoomInput = this.requiredElement<HTMLInputElement>('.uui-cropper__zoom');
    this.fileInput = this.requiredElement<HTMLInputElement>('.uui-cropper__file');
    this.selectButton = this.requiredElement<HTMLLabelElement>('.uui-cropper__select');

    this.setViewportCheckered(this.options.viewportCheckered);
    this.setViewportBackgroundColor(this.options.viewportBackgroundColor);
    this.setViewportMaskColor(this.options.viewportMaskColor);
    this.setBorderRadius(this.options.borderRadius);
    this.renderAspectRatioControl();
    this.renderControlPlacements();
  }

  getAspectRatioControlContainer(): HTMLElement | null {
    const selector = this.options.aspectRatioControlSelector?.trim();
    if (selector) {
      const container = this.root.ownerDocument?.querySelector<HTMLElement>(selector);
      if (!container) {
        throw new Error(`UpriseUICropper missing aspect ratio control container: ${selector}`);
      }
      return container;
    }

    return this.requiredElement<HTMLElement>('.uui-cropper__ratio-row');
  }

  renderAspectRatioControl(): void {
    this.ratioContainer = this.getAspectRatioControlContainer();
    this.ratioButtons = [];
    this.ratioSelect = null;

    const internalContainer = this.root.querySelector<HTMLElement>('.uui-cropper__ratio-row');
    const isInternalContainer = this.ratioContainer === internalContainer;
    const showAspectRatioControl = this.options.showAspectRatioControl !== false
      && this.options.aspectRatioControlType !== 'none'
      && this.options.aspectRatioControlType !== false;
    if (isInternalContainer) {
      internalContainer!.classList.toggle('uui-cropper__ratio-row--hidden', !showAspectRatioControl || Boolean(this.options.aspectRatioControlSelector?.trim()));
    }

    if (!showAspectRatioControl || !this.ratioContainer) {
      if (this.ratioContainer) this.ratioContainer.innerHTML = '';
      return;
    }

    this.ratioContainer.innerHTML = '';

    if (this.options.aspectRatioControlType === 'dropdown') {
      const select = document.createElement('select');
      select.className = 'uui-cropper__ratio-select';
      select.setAttribute('aria-label', 'Crop aspect ratio');
      for (const ratio of this.options.aspectRatios) {
        const option = document.createElement('option');
        option.value = String(ratio.value);
        option.textContent = ratio.label;
        option.selected = ratio.value === this.aspectRatio;
        select.append(option);
      }
      this.ratioContainer.append(select);
      this.ratioSelect = select;
      return;
    }

    this.ratioContainer.setAttribute('role', 'group');
    this.ratioContainer.setAttribute('aria-label', 'Crop aspect ratio');
    for (const ratio of this.options.aspectRatios) {
      const button = document.createElement('button');
      button.className = 'uui-cropper__ratio';
      button.type = 'button';
      button.textContent = ratio.label;
      button.dataset.ratio = String(ratio.value);
      button.setAttribute('aria-pressed', String(ratio.value === this.aspectRatio));
      this.ratioContainer.append(button);
      this.ratioButtons.push(button);
    }
  }

  renderControlPlacements(): void {
    const selectContainer = this.getControlContainer(this.options.selectButtonSelector, '.uui-cropper__controls');
    const zoomContainer = this.getControlContainer(this.options.zoomSelector, '.uui-cropper__controls');
    const statusContainer = this.getControlContainer(this.options.imageInfoSelector, '.uui-cropper__controls');
    const showZoomSlider = this.shouldShowZoomSlider();

    this.selectButton.classList.toggle('uui-cropper__select--hidden', !this.options.showSelectButton);
    this.zoomInput.classList.toggle('uui-cropper__zoom--hidden', !showZoomSlider);
    this.status.classList.toggle('uui-cropper__status--hidden', !this.options.showImageInfo);

    if (this.options.showSelectButton) selectContainer?.append(this.selectButton);
    if (showZoomSlider) zoomContainer?.append(this.zoomInput);
    if (this.options.showImageInfo) statusContainer?.append(this.status);
  }

  shouldShowZoomSlider(): boolean {
    if (!this.options.showZoom) return false;
    if (this.minZoom !== this.maxZoom) return true;

    if (!this.hasLoggedZoomSliderDisabled) {
      console.error('UpriseUICropper: zoom slider is disabled because minZoom and maxZoom are the same.', {
        minZoom: this.minZoom,
        maxZoom: this.maxZoom
      });
      this.hasLoggedZoomSliderDisabled = true;
    }

    return false;
  }

  getControlContainer(selector: string | undefined, fallbackSelector: string): HTMLElement | null {
    const trimmed = selector?.trim();
    if (trimmed) {
      const container = this.root.ownerDocument?.querySelector<HTMLElement>(trimmed);
      if (!container) throw new Error(`UpriseUICropper missing control container: ${trimmed}`);
      return container;
    }
    return this.requiredElement<HTMLElement>(fallbackSelector);
  }

  setViewportCheckered(enabled: boolean = true): void {
    this.options.viewportCheckered = Boolean(enabled);
    this.viewport.classList.toggle('uui-cropper__viewport--checkerboard', this.options.viewportCheckered);
    this.viewport.classList.toggle('uui-cropper__viewport--parent', !this.options.viewportCheckered);
    this.applyViewportMaskColor?.();
    this.applyViewportFrameShadow?.();
  }

  setViewportBackgroundColor(color: string = 'transparent'): void {
    const value = color || 'transparent';
    this.options.viewportBackgroundColor = value;
    this.viewport.style.setProperty('--uui-cropper-viewport-bg', value);
    this.applyViewportMaskColor?.();
  }

  setViewportMaskColor(color: string | null = null): void {
    // null = automatic:
    // - checkered mode keeps the dark editing mask
    // - non-checkered mode uses the configured background color, including transparent
    this.options.viewportMaskColor = color;
    this.applyViewportMaskColor();
  }

  applyViewportMaskColor(): void {
    const automaticColor = this.options.viewportCheckered
      ? 'rgba(0, 0, 0, 0.68)'
      : (this.options.viewportBackgroundColor || 'transparent');

    const color = this.options.viewportMaskColor ?? automaticColor;
    this.frameEl.style.setProperty('--uui-cropper-mask-color', color);
  }

  applyViewportFrameShadow(): void {
    const shadow = this.options.viewportCheckered
      ? '0 0 0 1px rgba(0, 0, 0, 0.24), inset 0 0 0 1px rgba(0, 0, 0, 0.18)'
      : 'none';

    this.frameEl.style.setProperty('--uui-cropper-frame-shadow', shadow);
  }

  setForceDarkMode(enabled: boolean = true): void {
    this.options.forceDarkMode = Boolean(enabled);
    this.root.dispatchEvent(new CustomEvent('themeoptionchange', {
      detail: {
        autoDarkMode: this.options.autoDarkMode,
        forceDarkMode: this.options.forceDarkMode
      }
    }));
  }

  setAutoDarkMode(enabled: boolean = true): void {
    this.options.autoDarkMode = Boolean(enabled);
    this.root.dispatchEvent(new CustomEvent('themeoptionchange', {
      detail: {
        autoDarkMode: this.options.autoDarkMode,
        forceDarkMode: this.options.forceDarkMode
      }
    }));
  }

  setBorderRadius(percent: number = 0): void {
    const value = this.clamp(Number(percent) || 0, 0, 50);
    this.options.borderRadius = value;
    this.applyBorderRadius();
  }

  getBorderRadiusPixels(): number {
    const percent = this.clamp(Number(this.options.borderRadius) || 0, 0, 50);
    const shortSide = Math.min(this.frame.width || 0, this.frame.height || 0);

    if (!shortSide) return 0;

    const ratio = Math.max(this.aspectRatio || 1, 1 / (this.aspectRatio || 1));
    const isSquare = Math.abs(ratio - 1) <= 0.001;

    // Strict non-pill behavior:
    // - 1:1 crops can reach 50% of the short side, producing a circle.
    // - Non-square crops are capped at 22% of the short side, producing
    //   a rounded rectangle and never a capsule/pill.
    const maxFactor = isSquare ? 0.5 : 0.22;

    return shortSide * (percent / 50) * maxFactor;
  }

  applyBorderRadius(): void {
    const radius = this.getBorderRadiusPixels();
    this.frameEl.style.setProperty('--uui-cropper-border-radius', `${radius}px`);
  }

  bind(): void {
    this.ratioContainer?.addEventListener('click', (event) => {
      const button = (event.target as Element | null)?.closest('[data-ratio]') as HTMLElement | null;
      if (!button) return;
      this.setAspectRatio(Number(button.dataset.ratio));
    });

    this.ratioSelect?.addEventListener('change', () => {
      this.setAspectRatio(Number(this.ratioSelect?.value));
    });

    this.zoomInput.addEventListener('input', () => {
      this.setZoom(this.levelToZoom(Number(this.zoomInput.value) / 100), { anchor: this.viewportCenter() });
    });

    this.zoomInput.addEventListener('change', () => {
      this.emitCropEnded();
    });

    this.fileInput.addEventListener('change', () => {
      const [file] = Array.from(this.fileInput.files || []);
      if (file) this.setImage(file);
    });

    this.viewport.addEventListener('pointerdown', (event) => {
      this.markCropStarted();
      this.viewport.setPointerCapture(event.pointerId);
      this.drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        panX: this.pan.x,
        panY: this.pan.y
      };
    });

    this.viewport.addEventListener('pointermove', (event) => {
      if (!this.drag || this.drag.pointerId !== event.pointerId) return;
      this.pan.x = this.drag.panX + event.clientX - this.drag.startX;
      this.pan.y = this.drag.panY + event.clientY - this.drag.startY;
      this.constrainPan();
      this.update();
    });

    this.viewport.addEventListener('pointerup', (event) => {
      if (this.drag?.pointerId === event.pointerId) {
        this.drag = null;
        this.emitCropEnded();
      }
    });

    this.viewport.addEventListener('pointercancel', () => {
      this.drag = null;
      this.emitCropEnded();
    });

    this.viewport.addEventListener('wheel', (event) => {
      event.preventDefault();
      const rect = this.viewport.getBoundingClientRect();
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const nextZoom = this.zoom * Math.exp(-event.deltaY * 0.0012);
      this.setZoom(nextZoom, { anchor });
    }, { passive: false });
  }

  async setImage(source: string | File | Blob): Promise<void> {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = '';
    }

    const src = source instanceof File || source instanceof Blob
      ? (this.objectUrl = URL.createObjectURL(source))
      : source;

    await new Promise((resolve, reject) => {
      this.image.onload = resolve;
      this.image.onerror = reject;
      this.image.src = src;
      this.frameImage.src = src;
      this.scheduleCropEnded();
    });

    this.natural = {
      width: this.image.naturalWidth,
      height: this.image.naturalHeight
    };

    this.pan = { x: 0, y: 0 };
    this.zoom = 1;
    this.layout();
  }

  setAspectRatio(ratio: number): void {
    if (!Number.isFinite(ratio) || ratio <= 0) return;

    this.markCropStarted();
    this.aspectRatio = ratio;

    for (const button of this.ratioButtons) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.ratio) === ratio));
    }
    if (this.ratioSelect) this.ratioSelect.value = String(ratio);

    this.layout();
    this.emitCropEnded();
  }

  setZoom(zoom: number, { anchor = this.viewportCenter() }: { anchor?: Point } = {}): void {
    this.markCropStarted();

    const next = this.clamp(zoom, this.minZoom, this.maxZoom);
    if (Math.abs(next - this.zoom) < 0.0001) {
      this.scheduleCropEnded();
      return;
    }

    const before = this.viewportToImage(anchor);
    this.zoom = next;
    this.zoomLevel = this.zoomToLevel(next);
    const after = this.imageToViewport(before);
    this.pan.x += anchor.x - after.x;
    this.pan.y += anchor.y - after.y;

    this.constrainPan();
    this.update();
    this.scheduleCropEnded();
  }

  zoomToLevel(zoom: number): number {
    if (this.maxZoom <= this.minZoom) return 0;
    return this.clamp((zoom - this.minZoom) / (this.maxZoom - this.minZoom), 0, 1);
  }

  levelToZoom(level: number): number {
    return this.minZoom + this.clamp(level, 0, 1) * (this.maxZoom - this.minZoom);
  }

  layout(): void {
    const vw = this.viewport.clientWidth;
    const vh = this.viewport.clientHeight;
    if (!vw || !vh || !this.natural.width || !this.natural.height) return;

    const imageRatio = this.natural.width / this.natural.height;
    if (imageRatio > vw / vh) {
      this.base.width = vw;
      this.base.height = vw / imageRatio;
    } else {
      this.base.height = vh;
      this.base.width = vh * imageRatio;
    }

    this.base.left = (vw - this.base.width) / 2;
    this.base.top = (vh - this.base.height) / 2;

    const maxFrameW = vw * 0.78;
    const maxFrameH = vh * 0.78;
    let frameW = maxFrameW;
    let frameH = frameW / this.aspectRatio;

    if (frameH > maxFrameH) {
      frameH = maxFrameH;
      frameW = frameH * this.aspectRatio;
    }

    this.frame = {
      width: frameW,
      height: frameH,
      left: (vw - frameW) / 2,
      top: (vh - frameH) / 2
    };

    this.minZoom = Math.max(
      this.options.minZoom,
      UpriseUICropper.MIN_VISIBLE_ZOOM,
      this.frame.width / this.base.width,
      this.frame.height / this.base.height
    );
    this.maxZoom = Math.max(this.options.maxZoom, this.minZoom);

    if (!this.hasAppliedInitialZoom) {
      this.zoom = this.clamp(this.options.initialZoom, this.minZoom, this.maxZoom);
      this.hasAppliedInitialZoom = true;
    } else {
      this.zoom = this.clamp(this.zoom, this.minZoom, this.maxZoom);
    }
    this.zoomLevel = this.zoomToLevel(this.zoom);
    this.renderControlPlacements();
    this.constrainPan();
    this.applyBorderRadius();
    this.update();
  }

  update(): void {
    const display = this.getDisplayRect();

    this.image.style.width = `${this.base.width}px`;
    this.image.style.height = `${this.base.height}px`;
    this.image.style.transform = `translate(${display.left}px, ${display.top}px) scale(${this.zoom})`;

    this.frameImage.style.width = `${this.base.width}px`;
    this.frameImage.style.height = `${this.base.height}px`;
    this.frameImage.style.transform = `translate(${display.left - this.frame.left}px, ${display.top - this.frame.top}px) scale(${this.zoom})`;

    Object.assign(this.frameEl.style, {
      width: `${this.frame.width}px`,
      height: `${this.frame.height}px`,
      left: `${this.frame.left}px`,
      top: `${this.frame.top}px`
    });

    this.zoomInput.value = String(this.zoomLevel * 100);
    this.updateStatus();
    this.root.dispatchEvent(new CustomEvent('cropchange', { detail: this.getCropData() }));
  }

  constrainPan(): void {
    const d = this.getDisplayRect();
    const frameRight = this.frame.left + this.frame.width;
    const frameBottom = this.frame.top + this.frame.height;

    if (d.left > this.frame.left) this.pan.x -= d.left - this.frame.left;
    if (d.top > this.frame.top) this.pan.y -= d.top - this.frame.top;
    if (d.left + d.width < frameRight) this.pan.x += frameRight - (d.left + d.width);
    if (d.top + d.height < frameBottom) this.pan.y += frameBottom - (d.top + d.height);
  }

  getDisplayRect(): Rect {
    const width = this.base.width * this.zoom;
    const height = this.base.height * this.zoom;
    return {
      width,
      height,
      left: this.base.left + this.pan.x,
      top: this.base.top + this.pan.y
    };
  }

  viewportCenter(): Point {
    return {
      x: this.viewport.clientWidth / 2,
      y: this.viewport.clientHeight / 2
    };
  }

  viewportToImage(point: Point): Point {
    const d = this.getDisplayRect();
    return {
      x: ((point.x - d.left) / d.width) * this.natural.width,
      y: ((point.y - d.top) / d.height) * this.natural.height
    };
  }

  imageToViewport(point: Point): Point {
    const d = this.getDisplayRect();
    return {
      x: d.left + (point.x / this.natural.width) * d.width,
      y: d.top + (point.y / this.natural.height) * d.height
    };
  }

  getCropData(): UpriseUICropData {
    const d = this.getDisplayRect();
    const sx = ((this.frame.left - d.left) / d.width) * this.natural.width;
    const sy = ((this.frame.top - d.top) / d.height) * this.natural.height;
    const sw = (this.frame.width / d.width) * this.natural.width;
    const sh = (this.frame.height / d.height) * this.natural.height;

    return {
      x: Math.round(this.clamp(sx, 0, this.natural.width)),
      y: Math.round(this.clamp(sy, 0, this.natural.height)),
      width: Math.round(this.clamp(sw, 1, this.natural.width)),
      height: Math.round(this.clamp(sh, 1, this.natural.height)),
      naturalWidth: this.natural.width,
      naturalHeight: this.natural.height,
      zoom: this.zoom,
      zoomLevel: this.zoomLevel,
      aspectRatio: this.aspectRatio
    };
  }

  getCanvas({ width, height }: { width?: number; height?: number } = {}): HTMLCanvasElement {
    const crop = this.getCropData();
    const canvas = document.createElement('canvas');
    canvas.width = width || crop.width;
    canvas.height = height || crop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is unavailable.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      this.image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
    return canvas;
  }

  getBlob(type: string = 'image/png', quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.getCanvas().toBlob((blob: Blob | null) => {
        blob ? resolve(blob) : reject(new Error('Canvas export failed.'));
      }, type, quality);
    });
  }

  updateStatus(): void {
    const crop = this.getCropData();
    const label = this.options.aspectRatios.find((ratio) => ratio.value === this.aspectRatio)?.label || this.aspectRatio.toFixed(2);
    this.status.value = `Image: ${this.natural.width} × ${this.natural.height}px • Zoom: ${Math.round(this.zoomLevel * 100)}% • Crop: ${crop.width} × ${crop.height}px • Ratio: ${label}`;
    this.status.textContent = this.status.value;
  }

  clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }



  emitCropStarted(): void {
    this.root.dispatchEvent(new CustomEvent('cropstarted', {
      detail: this.getCropData()
    }));
  }

  markCropStarted(): void {
    clearTimeout(this.cropEndTimer);
    if (this.isCropInteracting) return;
    this.isCropInteracting = true;
    this.emitCropStarted();
  }

  scheduleCropEnded(delay: number = 120): void {
    clearTimeout(this.cropEndTimer);
    this.cropEndTimer = window.setTimeout(() => {
      this.emitCropEnded();
    }, delay);
  }

  emitCropEnded(): void {
    if (!this.isCropInteracting) return;
    this.isCropInteracting = false;
    this.root.dispatchEvent(new CustomEvent('cropended', {
      detail: this.getCropData()
    }));
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.root.innerHTML = '';
  }
}
