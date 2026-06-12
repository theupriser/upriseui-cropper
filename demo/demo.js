import { UpriseUICropper } from '../dist/index.js';

    const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const autoDarkModeToggle = document.querySelector('#autoDarkModeToggle');
    const darkModeToggle = document.querySelector('#darkModeToggle');
    let cropperRoot = document.querySelector('#cropper');
    const outputCanvas = document.querySelector('#outputCanvas');
    const cropDataEl = document.querySelector('#cropData');
    const integrationCode = document.querySelector('#integrationCode');
    const ratioControlTypeSelect = document.querySelector('#ratioControlType');
    const ratioSlot = document.querySelector('#ratioSlot');
    const selectSlot = document.querySelector('#selectSlot');
    const zoomSlot = document.querySelector('#zoomSlot');
    const infoSlot = document.querySelector('#infoSlot');
    const viewportCheckeredInput = document.querySelector('#viewportCheckered');
    const viewportBackgroundControls = document.querySelector('#viewportBackgroundControls');
    const viewportBackgroundColorInput = document.querySelector('#viewportBackgroundColor');
    const viewportBackgroundTransparentButton = document.querySelector('#viewportBackgroundTransparent');
    const borderRadiusInput = document.querySelector('#borderRadius');
    const borderRadiusOutput = document.querySelector('#borderRadiusOutput');

    let viewportBackgroundColor = 'transparent';
    let previewFrame = 0;
    let aspectRatioControlType = ratioControlTypeSelect.value;
    let cropper;

    function renderCropperShell() {
      cropperRoot.innerHTML = `
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
          <input class="uui-cropper__zoom" type="range" min="1" max="5" step="0.01" value="1" aria-label="Zoom" />
          <output class="uui-cropper__status">Image: 0 × 0px • Zoom: 100% • Crop: 0 × 0px</output>
        </div>
      `;
    }

    function applyResolvedTheme() {
      if (!cropper) return;
      const shouldUseDark = autoDarkModeToggle.checked
        ? systemThemeQuery.matches
        : cropper.options.forceDarkMode;

      darkModeToggle.checked = shouldUseDark;
      document.documentElement.dataset.theme = shouldUseDark ? 'dark' : 'light';
      renderIntegrationCode?.();
    }

    function syncDarkModeFromBrowser() {
      if (!autoDarkModeToggle.checked) return;
      applyResolvedTheme();
    }

    function setAutoDarkMode(enabled) {
      autoDarkModeToggle.checked = Boolean(enabled);
      darkModeToggle.disabled = autoDarkModeToggle.checked;

      if (cropper) {
        cropper.setAutoDarkMode?.(autoDarkModeToggle.checked);
        if (!autoDarkModeToggle.checked) {
          cropper.setForceDarkMode?.(darkModeToggle.checked);
        }
      }

      applyResolvedTheme();
      renderCropData?.();
      scheduleOutputPreview?.();
    }

    function setForceDarkMode(enabled) {
      cropper?.setForceDarkMode?.(Boolean(enabled));
      if (!autoDarkModeToggle.checked) {
        applyResolvedTheme();
      }
      renderCropData?.();
      scheduleOutputPreview?.();
    }

    function syncViewportBackgroundControls() {
      viewportBackgroundControls.classList.toggle('demo-hidden', viewportCheckeredInput.checked);
    }

    function buildCropper() {
      const isExternal = aspectRatioControlType === 'external';
      const showAspectRatioControl = aspectRatioControlType !== 'false';
      const previousRatio = cropper?.aspectRatio ?? 1;
      ratioSlot.classList.toggle('demo-hidden', !isExternal);
      if (!isExternal) {
        ratioSlot.replaceChildren();
      }

      if (cropper) {
        cropper.destroy();
      }

      cropperRoot.replaceChildren();
      renderCropperShell();

      cropper = new UpriseUICropper(cropperRoot, {
        src: '../sample.jpg',
        aspectRatios: [
          { label: '1:1 Square', value: 1 },
          { label: '4:3 Standard', value: 4 / 3 },
          { label: '16:9 Landscape', value: 16 / 9 },
          { label: '9:16 Story', value: 9 / 16 },
          { label: '3:4 Portrait', value: 3 / 4 },
          { label: '2:3 Photo', value: 2 / 3 }
        ],
        initialAspectRatio: previousRatio,
        showAspectRatioControl,
        aspectRatioControlType: 'buttons',
        aspectRatioControlSelector: isExternal ? '#ratioSlot' : '',
        showSelectButton: true,
        selectButtonSelector: '#selectSlot',
        showZoom: true,
        zoomSelector: '#zoomSlot',
        showImageInfo: true,
        imageInfoSelector: '#infoSlot',
        viewportCheckered: viewportCheckeredInput.checked,
        viewportBackgroundColor,
        viewportMaskColor: null,
        borderRadius: Number(borderRadiusInput.value),
        autoDarkMode: autoDarkModeToggle.checked,
        forceDarkMode: darkModeToggle.checked,
        maxZoom: 6
      });

      cropper.setImage('../sample.jpg').then(() => {
        cropper.setAspectRatio(previousRatio);
      });
      return cropper;
    }

    function getActiveRatioOption() {
      if (!cropper) {
        return { label: 'Custom', value: 1 };
      }
      return cropper.options.aspectRatios.find((ratio) => ratio.value === cropper.aspectRatio) || {
        label: 'Custom',
        value: cropper.aspectRatio
      };
    }

    function formatRatioValue(value) {
      const known = [
        [1, '1'],
        [4 / 3, '4 / 3'],
        [16 / 9, '16 / 9'],
        [9 / 16, '9 / 16'],
        [3 / 4, '3 / 4'],
        [2 / 3, '2 / 3']
      ];

      const match = known.find(([numeric]) => Math.abs(numeric - value) < 0.0001);
      return match ? match[1] : Number(value.toFixed(4)).toString();
    }

    function renderCropData(data) {
      if (!cropper) return;
      const nextData = data || cropper.getCropData();
      cropDataEl.innerHTML = Object.entries({
        x: nextData.x,
        y: nextData.y,
        width: nextData.width,
        height: nextData.height,
        zoom: `${Math.round(nextData.zoom * 100)}%`,
        ratio: Number(nextData.aspectRatio.toFixed(4)),
        radiusSlider: `${cropper.options.borderRadius}/50`,
        viewportCheckered: cropper.options.viewportCheckered,
        viewportBackgroundColor: cropper.options.viewportBackgroundColor,
        autoDarkMode: autoDarkModeToggle.checked,
        forceDarkMode: cropper.options.forceDarkMode,
        darkMode: darkModeToggle.checked,
        theme: document.documentElement.dataset.theme || 'light'
      }).map(([key, value]) => `
        <div>
          <dt>${key}</dt>
          <dd>${value}</dd>
        </div>
      `).join('');
    }

    function renderIntegrationCode() {
      if (!cropper) return;
      const ratio = getActiveRatioOption();
      const showRatioCode = aspectRatioControlType === 'false' ? 'false' : 'true';
      const ratioSelectorCode = aspectRatioControlType === 'external' ? `\n    aspectRatioControlSelector: '#ratioSlot',` : '';
      const code = `import { UpriseUICropper } from '../dist/index.js';

const cropper = new UpriseUICropper(
  document.querySelector('#cropper'),
  {
    src: '../sample.jpg',
    aspectRatios: [
      { label: '1:1 Square', value: 1 },
      { label: '4:3 Standard', value: 4 / 3 },
      { label: '16:9 Landscape', value: 16 / 9 },
      { label: '9:16 Story', value: 9 / 16 },
      { label: '3:4 Portrait', value: 3 / 4 },
      { label: '2:3 Photo', value: 2 / 3 }
    ],
    initialAspectRatio: ${formatRatioValue(ratio.value)},
    showAspectRatioControl: ${showRatioCode},
    aspectRatioControlType: 'buttons',${ratioSelectorCode}
    showSelectButton: true,
    selectButtonSelector: '#selectSlot',
    showZoom: true,
    zoomSelector: '#zoomSlot',
    showImageInfo: true,
    imageInfoSelector: '#infoSlot',
    viewportCheckered: ${cropper.options.viewportCheckered},
    viewportBackgroundColor: '${cropper.options.viewportBackgroundColor}',
    viewportMaskColor: null,
    borderRadius: ${cropper.options.borderRadius}, // strict non-pill rounded corners
    autoDarkMode: ${cropper.options.autoDarkMode},
    forceDarkMode: ${cropper.options.forceDarkMode},
    maxZoom: ${cropper.options.maxZoom}
  }
);

cropper.setZoom(${Number(cropper.zoom.toFixed(2))});

const blob = await cropper.getBlob('image/png');
const data = cropper.getCropData();`;

      integrationCode.textContent = code;
    }

    function getOutputPreviewRadius() {
      const percent = Math.max(0, Math.min(50, Number(cropper.options.borderRadius) || 0));
      const width = outputCanvas.clientWidth || outputCanvas.width || 0;
      const height = outputCanvas.clientHeight || outputCanvas.height || 0;
      const shortSide = Math.min(width, height);
      const ratio = Math.max(cropper.aspectRatio || 1, 1 / (cropper.aspectRatio || 1));
      const isSquare = Math.abs(ratio - 1) <= 0.001;
      const maxFactor = isSquare ? 0.5 : 0.22;

      return shortSide * (percent / 50) * maxFactor;
    }

    function renderOutputPreview() {
      if (!cropper) return;
      const crop = cropper.getCropData();
      const exportWidth = 640;
      const exportHeight = Math.round(exportWidth / crop.aspectRatio);
      const cropCanvas = cropper.getCanvas({
        width: exportWidth,
        height: exportHeight
      });

      outputCanvas.width = cropCanvas.width;
      outputCanvas.height = cropCanvas.height;

      const previewBox = outputCanvas.parentElement;
      const availableWidth = Math.max(1, previewBox.clientWidth - 32);
      const availableHeight = Math.max(1, previewBox.clientHeight - 32);
      const scale = Math.min(availableWidth / exportWidth, availableHeight / exportHeight, 1);

      outputCanvas.style.width = `${Math.floor(exportWidth * scale)}px`;
      outputCanvas.style.height = `${Math.floor(exportHeight * scale)}px`;
      outputCanvas.style.borderRadius = `${getOutputPreviewRadius()}px`;

      outputCanvas.getContext('2d').drawImage(cropCanvas, 0, 0);
    }

    function scheduleOutputPreview() {
      cancelAnimationFrame(previewFrame);
      previewFrame = requestAnimationFrame(renderOutputPreview);
    }

    function downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement('a'), {
        href: url,
        download: filename
      });
      link.click();
      URL.revokeObjectURL(url);
    }



    cropperRoot.addEventListener('cropchange', (event) => {
      renderCropData(event.detail);
      renderIntegrationCode();
      scheduleOutputPreview();
    });

    cropperRoot.addEventListener('cropstarted', (event) => {
      // Useful for showing loading states, disabling submit buttons, etc.
      // console.log('cropStarted', event.detail);
    });

    cropperRoot.addEventListener('cropended', (event) => {
      console.log('cropData', event.detail);
    });

    autoDarkModeToggle.addEventListener('change', (event) => {
      setAutoDarkMode(event.target.checked);
      renderIntegrationCode();
    });

    darkModeToggle.addEventListener('change', (event) => {
      if (autoDarkModeToggle.checked) return;
      setForceDarkMode(event.target.checked);
    });

    systemThemeQuery.addEventListener('change', () => {
      syncDarkModeFromBrowser();
      renderCropData();
      scheduleOutputPreview();
    });

    viewportCheckeredInput.addEventListener('change', (event) => {
      cropper.setViewportCheckered(event.target.checked);
      syncViewportBackgroundControls();
      renderCropData();
      renderIntegrationCode();
      scheduleOutputPreview();
    });

    viewportBackgroundColorInput.addEventListener('input', (event) => {
      viewportBackgroundColor = event.target.value;
      cropper.setViewportBackgroundColor(viewportBackgroundColor);
      if (!viewportCheckeredInput.checked) {
        cropper.setViewportCheckered(false);
      }
      renderCropData();
      renderIntegrationCode();
      scheduleOutputPreview();
    });

    viewportBackgroundTransparentButton.addEventListener('click', () => {
      viewportBackgroundColor = 'transparent';
      cropper.setViewportBackgroundColor('transparent');
      if (!viewportCheckeredInput.checked) {
        cropper.setViewportCheckered(false);
      }
      renderCropData();
      renderIntegrationCode();
      scheduleOutputPreview();
    });

    borderRadiusInput.addEventListener('input', (event) => {
      const value = Number(event.target.value);
      borderRadiusOutput.textContent = `${value}%`;
      cropper.setBorderRadius(value);
      outputCanvas.style.borderRadius = `${getOutputPreviewRadius()}px`;
      renderCropData();
      renderIntegrationCode();
      scheduleOutputPreview();
    });

    document.querySelector('#downloadPng').addEventListener('click', async () => {
      downloadBlob(await cropper.getBlob('image/png'), 'crop.png');
    });

    document.querySelector('#downloadJpeg').addEventListener('click', async () => {
      downloadBlob(await cropper.getBlob('image/jpeg', 0.92), 'crop.jpg');
    });

    document.querySelector('#reset').addEventListener('click', async () => {
      if (!cropper) return;
      await cropper.setImage('../sample.jpg');
      cropper.setAspectRatio(1);
      cropper.setViewportCheckered(viewportCheckeredInput.checked);
      cropper.setViewportBackgroundColor(viewportBackgroundColor);
      cropper.setBorderRadius(Number(borderRadiusInput.value));
      cropper.setAutoDarkMode(autoDarkModeToggle.checked);
      cropper.setForceDarkMode(darkModeToggle.checked);
      applyResolvedTheme();
      renderOutputPreview();
      renderCropData();
      renderIntegrationCode();
    });

    ratioControlTypeSelect.addEventListener('change', (event) => {
      aspectRatioControlType = event.target.value;
      buildCropper();
      renderCropData();
      renderIntegrationCode();
      scheduleOutputPreview();
    });

    const resizeObserver = new ResizeObserver(() => {
      renderOutputPreview();
    });
    resizeObserver.observe(document.querySelector('.demo-output-wrap'));

    window.addEventListener('load', () => {
      syncViewportBackgroundControls();
      buildCropper();
      setAutoDarkMode(true);
      renderCropData();
      renderIntegrationCode();
      renderOutputPreview();
    });
