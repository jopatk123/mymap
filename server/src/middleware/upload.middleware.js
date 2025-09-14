const {
  handleSingleUpload,
  handleBatchUpload,
  handleKmlUpload,
  handleVideoUpload,
} = require('./upload/handlers');
const { generateThumbnail, deleteFile, getFileInfo } = require('./upload/utils');

module.exports = {
  handleSingleUpload,
  handleBatchUpload,
  handleKmlUpload,
  handleVideoUpload,
  generateThumbnail,
  deleteFile,
  getFileInfo,
};
