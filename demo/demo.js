import { UpriseUICropper } from '../dist/index.js';

    const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const autoDarkModeToggle = document.querySelector('#autoDarkModeToggle');
    const darkModeToggle = document.querySelector('#darkModeToggle');
    const cropperRoot = document.querySelector('#cropper');
    const outputCanvas = document.querySelector('#outputCanvas');
    const cropDataEl = document.querySelector('#cropData');
    const integrationCode = document.querySelector('#integrationCode');
    const viewportCheckeredInput = document.querySelector('#viewportCheckered');
    const viewportBackgroundControls = document.querySelector('#viewportBackgroundControls');
    const viewportBackgroundColorInput = document.querySelector('#viewportBackgroundColor');
    const viewportBackgroundTransparentButton = document.querySelector('#viewportBackgroundTransparent');
    const borderRadiusInput = document.querySelector('#borderRadius');
    const borderRadiusOutput = document.querySelector('#borderRadiusOutput');

    let viewportBackgroundColor = 'transparent';
    let previewFrame = 0;

    function applyResolvedTheme() {
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
      cropper?.setAutoDarkMode?.(autoDarkModeToggle.checked);
      darkModeToggle.disabled = autoDarkModeToggle.checked;

      if (!autoDarkModeToggle.checked) {
        cropper?.setForceDarkMode?.(darkModeToggle.checked);
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

    const cropper = new UpriseUICropper(cropperRoot, {
      src: '../sample.jpg',
      aspectRatios: [
        { label: '1:1 Square', value: 1 },
        { label: '4:3 Standard', value: 4 / 3 },
        { label: '16:9 Landscape', value: 16 / 9 },
        { label: '9:16 Story', value: 9 / 16 },
        { label: '3:4 Portrait', value: 3 / 4 },
        { label: '2:3 Photo', value: 2 / 3 }
      ],
      initialAspectRatio: 1,
      viewportCheckered: viewportCheckeredInput.checked,
      viewportBackgroundColor,
      viewportMaskColor: null,
      borderRadius: Number(borderRadiusInput.value),
      autoDarkMode: autoDarkModeToggle.checked,
      forceDarkMode: darkModeToggle.checked,
      maxZoom: 6
    });

    function getActiveRatioOption() {
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

    function renderCropData(data = cropper.getCropData()) {
      cropDataEl.innerHTML = Object.entries({
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        zoom: `${Math.round(data.zoom * 100)}%`,
        ratio: Number(data.aspectRatio.toFixed(4)),
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
      const ratio = getActiveRatioOption();
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

    const resizeObserver = new ResizeObserver(() => {
      renderOutputPreview();
    });
    resizeObserver.observe(document.querySelector('.demo-output-wrap'));

    window.addEventListener('load', () => {
      setAutoDarkMode(true);
      syncViewportBackgroundControls();
      renderCropData();
      renderIntegrationCode();
      renderOutputPreview();
    });
