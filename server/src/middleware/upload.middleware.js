const {
  handleSingleUpload,
  handleBatchUpload,
  handleKmlUpload,
  handleVideoUpload,
  handleImageSetUpload,
  handleImageSetAddImages,
} = require('./upload/handlers');
const { generateThumbnail, deleteFile, getFileInfo } = require('./upload/utils');

module.exports = {
  handleSingleUpload,
  handleBatchUpload,
  handleKmlUpload,
  handleVideoUpload,
  handleImageSetUpload,
  handleImageSetAddImages,
  generateThumbnail,
  deleteFile,
  getFileInfo,
};
