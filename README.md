# @upriseui/cropper

Dependency-free vanilla JavaScript image cropper with fixed aspect ratios, canvas/blob export helpers, theme options, and crop lifecycle events.

## Install

```bash
npm install @upriseui/cropper
```

## Usage

Import the JavaScript and CSS:

```js
import { UpriseUICropper } from '@upriseui/cropper';
import '@upriseui/cropper/style.css';

const cropper = new UpriseUICropper(document.querySelector('#cropper'), {
  src: '/image.jpg',
  aspectRatios: [
    { label: '1:1 Square', value: 1 },
    { label: '4:3 Standard', value: 4 / 3 },
    { label: '16:9 Landscape', value: 16 / 9 },
    { label: '9:16 Story', value: 9 / 16 },
    { label: '3:4 Portrait', value: 3 / 4 },
    { label: '2:3 Photo', value: 2 / 3 }
  ],
  initialAspectRatio: 1,
  viewportCheckered: true,
  viewportBackgroundColor: 'transparent',
  viewportMaskColor: null,
  borderRadius: 0,
  autoDarkMode: true,
  forceDarkMode: false,
  minZoom: 1,
  maxZoom: 5
});
```

```html
<div id="cropper" class="uui-cropper"></div>
```

The parent container can control the cropper size:

```css
.cropper-box {
  width: 600px;
  height: 400px;
}

.cropper-box .uui-cropper {
  width: 100%;
  height: 100%;
}
```

The cropper uses pointer events for mouse, pen, and touch dragging. Pinch-to-zoom is not currently implemented; use the zoom slider/API for zoom.

## Options

### `src`

Image URL, `File`, or `Blob`.

```js
src: '/image.jpg'
```

You can also set it later:

```js
await cropper.setImage(file);
```

### `aspectRatios`

Array of ratio buttons shown in the cropper UI.

```js
aspectRatios: [
  { label: '1:1 Square', value: 1 },
  { label: '16:9 Landscape', value: 16 / 9 }
]
```

### `initialAspectRatio`

Initial crop-frame ratio.

```js
initialAspectRatio: 1
```

### `viewportCheckered`

Shows a checkered crop viewport background.

```js
viewportCheckered: true
```

### `viewportBackgroundColor`

The background color used when `viewportCheckered` is disabled.

```js
viewportBackgroundColor: 'transparent'
```

### `viewportMaskColor`

Optional explicit outside-crop mask color.

```js
viewportMaskColor: null
```

When `null`, the demo uses a dark mask in checkered mode and the non-checkered background color when checkered mode is disabled.

### `borderRadius`

Crop-frame rounding from `0` to `50`.

```js
borderRadius: 0
```

At `50`, a square crop becomes circular. Non-square ratios are capped so they stay rounded rectangles rather than becoming pills.

### `autoDarkMode` / `forceDarkMode`

`autoDarkMode` is enabled by default.

```js
autoDarkMode: true,
forceDarkMode: false
```

Resolution logic:

```js
const shouldUseDark = autoDarkMode
  ? window.matchMedia('(prefers-color-scheme: dark)').matches
  : forceDarkMode;
```

- `autoDarkMode: true` follows the browser/OS dark-mode preference.
- `autoDarkMode: false` and `forceDarkMode: true` forces dark mode.
- `autoDarkMode: false` and `forceDarkMode: false` forces light mode.

The cropper stores these options and emits `themeoptionchange` when they are changed, but your app controls how the final theme is applied.

### `minZoom` / `maxZoom`

```js
minZoom: 1,
maxZoom: 5
```

## Methods

```js
await cropper.setImage(urlOrFile);

cropper.setAspectRatio(1);
cropper.setZoom(2);

cropper.setViewportCheckered(false);
cropper.setViewportBackgroundColor('transparent');
cropper.setViewportMaskColor(null);

cropper.setBorderRadius(50);
cropper.setAutoDarkMode(false);
cropper.setForceDarkMode(true);

const data = cropper.getCropData();
const canvas = cropper.getCanvas();
const blob = await cropper.getBlob('image/png');

cropper.destroy();
```

Compatibility helpers:

```js
cropper.setViewportBackground('parent');
cropper.setViewportBackground('checkerboard');

cropper.setRounded(true);
cropper.setRounded(false);
```

## Events

```js
const cropperRoot = document.querySelector('#cropper');

cropperRoot.addEventListener('cropstarted', (event) => {
  // The user started a drag/zoom crop interaction.
});

cropperRoot.addEventListener('cropchange', (event) => {
  // Live crop data while the crop changes.
  console.log(event.detail);
});

cropperRoot.addEventListener('cropended', (event) => {
  // Final crop data when the interaction finishes.
  console.log(event.detail);
});

cropperRoot.addEventListener('themeoptionchange', (event) => {
  console.log(event.detail.autoDarkMode, event.detail.forceDarkMode);
});
```


### Event lifecycle

Crop lifecycle events are always emitted for user interactions and crop-changing API calls.

- aspect-ratio changes: `cropstarted` -> `cropchange` -> `cropended`
- image drag: `cropstarted` -> repeated `cropchange` -> `cropended`
- wheel or zoom-slider zoom: `cropstarted` -> repeated `cropchange` -> `cropended`
- `setAspectRatio()` and `setZoom()`: lifecycle events are emitted automatically

No extra configuration is needed.

## Crop data

`getCropData()` and event `detail` return:

```js
{
  x: 120,
  y: 80,
  width: 640,
  height: 640,
  naturalWidth: 1920,
  naturalHeight: 1280,
  zoom: 1.4,
  aspectRatio: 1
}
```

`x`, `y`, `width`, and `height` are in the source image’s natural pixel coordinate space.

## Exporting

Export using the crop’s natural size:

```js
const canvas = cropper.getCanvas();
```

Export at a custom size:

```js
const canvas = cropper.getCanvas({
  width: 1200,
  height: 800
});
```

Export a blob:

```js
const png = await cropper.getBlob('image/png');
const jpeg = await cropper.getBlob('image/jpeg', 0.92);
```

## Demo

Install dependencies and start the demo:

```bash
npm install
npm run dev
```

Then open the Vite URL and go to `/demo/`. The demo imports the compiled `dist/index.js` and `dist/style.css` files, so run `npm run build` after changing TypeScript source.

The demo is split into `demo/index.html`, `demo/demo.css`, and `demo/demo.js`.

The demo uses a mountain/lake sample image at `sample.jpg`.

The demo includes:

- aspect-ratio buttons
- drag and zoom controls
- checkered/non-checkered viewport background
- non-checkered background color controls
- crop-frame radius control
- auto dark mode and force dark mode controls
- live output preview
- live crop data
- console logging on `cropended`
- live integration snippet

## TypeScript source

The repository source lives in:

```text
src/index.ts
src/style.css
```

The published JavaScript and type declarations are generated in:

```text
dist/index.js
dist/index.d.ts
dist/style.css
```

Run type checking with:

```bash
npm run typecheck
```

## Build

The source is TypeScript. The build step compiles `src/index.ts` to `dist/index.js` and generates `dist/index.d.ts`, then copies `src/style.css` to `dist/style.css`.

```bash
npm run build
```

## Gitea package publishing workflow

This package includes one Actions workflow that works for both GitHub Actions and Gitea Actions:

```text
.github/workflows/publish.yml
```

The workflow runs on pushes to `main` or `master` when package-related files change. It reads the version from `package.json` and checks for a matching git tag:

```text
v1.0.0
```

If that tag already exists, publishing is skipped. If the tag does not exist, the workflow:

1. installs dependencies,
2. runs `npm run build`,
3. publishes the package to the Gitea npm package registry,
4. creates and pushes the version tag.

### Required repository secret

Create a repository secret:

```text
GITEA_TOKEN
```

The token needs permission to publish packages and push tags. Gitea and GitHub Actions can expose different default tokens. The workflow uses `GITEA_TOKEN` when present and falls back to `GITHUB_TOKEN`, but `GITEA_TOKEN` is recommended for publishing to a Gitea package registry.

### Optional repository variables

Set these repository variables if your Gitea runner does not expose them automatically or you want to publish under a different package owner:

```text
GITEA_SERVER_URL=https://gitea.example.com
PACKAGE_OWNER=your-user-or-org
```

The package is published to:

```text
https://gitea.example.com/api/packages/PACKAGE_OWNER/npm/
```

### Versioning flow

To release a new version:

```bash
npm version patch
git push
```

or manually edit `package.json`, commit the change, and push.

When the workflow sees a new `package.json` version without a matching `vX.Y.Z` tag, it publishes and creates the tag automatically.

## Published npm files

The npm package only ships the files consumers need:

```text
dist/
README.md
LICENSE
```

Source, demo, tests, scripts, and workflows stay in the repository but are not included in the published npm package.

## Publish checklist

```bash
npm install
npm run build
npm pack --dry-run
npm publish --access public
```

The package name is currently set to `@upriseui/cropper`. Change `name` in `package.json` before publishing if that npm scope is not available.


## Demo import note

Browsers do not load `.ts` files directly from a plain static server. The demo imports the compiled JavaScript from `dist/index.js` and CSS from `dist/style.css`.

After editing `src/index.ts`, run:

```bash
npm run build
```

Then serve the project and open `/demo/`.


## Build verified

`npm run build` compiles the TypeScript source and generates the published `dist/` files.
