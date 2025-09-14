import api from './index.js';

export const videoPointStyleApi = {
  getStyles() {
    return api.get('/point-styles/video');
  },
  updateStyles(styleConfig) {
    return api.put('/point-styles/video', styleConfig);
  },
  resetStyles() {
    return api.delete('/point-styles/video');
  },
};

export const panoramaPointStyleApi = {
  getStyles() {
    return api.get('/point-styles/panorama');
  },
  updateStyles(styleConfig) {
    return api.put('/point-styles/panorama', styleConfig);
  },
  resetStyles() {
    return api.delete('/point-styles/panorama');
  },
};
