import '../src/style.css';
import { UpriseUICropper } from '../src/index.ts';

const modalEl = document.querySelector('#cropperModal');
const cropperRoot = document.querySelector('#cropper');
const selectSlot = document.querySelector('#selectSlot');
const zoomSlot = document.querySelector('#zoomSlot');
const infoSlot = document.querySelector('#infoSlot');
const ratioSlot = document.querySelector('#ratioSlot');

let cropper;

function initCropper() {
  if (cropper) return cropper;

  cropper = new UpriseUICropper(cropperRoot, {
    src: '../sample.jpg',
    showAspectRatioControl: true,
    showSelectButton: true,
    showZoom: true,
    showImageInfo: true,
    aspectRatioControlSelector: '#ratioSlot',
    selectButtonSelector: '#selectSlot',
    zoomSelector: '#zoomSlot',
    imageInfoSelector: '#infoSlot',
    initialAspectRatio: 1,
    viewportCheckered: true,
    viewportBackgroundColor: 'transparent',
    viewportMaskColor: null,
    borderRadius: 50,
    autoDarkMode: true,
    forceDarkMode: false,
    initialZoom: 0.1,
    minZoom: 0,
    maxZoom: 5,
  });

  return cropper;
}

modalEl.addEventListener('shown.bs.modal', () => {
  initCropper();
});
