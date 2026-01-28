const multer = require('multer');
const path = require('path');
const { uploaders } = require('./storage');
const { generateThumbnail, buildFileUrl, cleanupFiles } = require('./utils');
const { uploadDir } = require('./config');
const { errorResponse } = require('../../utils/response');

const logUploadError = (message, error) => {
  try {
    const Logger = require('../../utils/logger');
    Logger.error(message, error);
  } catch (_) {}
};

const respondMulterError = (res, err, messages, defaultMessage) => {
  if (err instanceof multer.MulterError) {
    const message = (messages && messages[err.code]) || defaultMessage;
    return res.status(400).json(errorResponse(message));
  }

  return res.status(400).json(errorResponse(err.message));
};

const buildThumbnailUrls = async (req, file) => {
  const thumbnailDir = path.join(uploadDir, 'thumbnails');
  const thumbnailFilename = `thumb-${file.filename}`;
  const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

  const thumbnailGenerated = await generateThumbnail(file.path, thumbnailPath);

  return {
    thumbnailFilename,
    thumbnailUrl: thumbnailGenerated
      ? buildFileUrl(req, `uploads/thumbnails/${thumbnailFilename}`)
      : null,
  };
};

const cleanupUploadedFiles = async (files) => {
  if (!files) return;

  if (Array.isArray(files)) {
    if (files.length === 0) return;
    await cleanupFiles(files.map((file) => file.path));
    return;
  }

  await cleanupFiles(files.path);
};

const createUploadHandler = ({
  uploader,
  getFiles,
  noFileMessage,
  multerMessages,
  multerDefaultMessage,
  uploadErrorMessage,
  processErrorMessage,
  processErrorLogMessage,
  processFiles,
}) => (req, res, next) => {
  uploader(req, res, async (err) => {
    if (err) {
      logUploadError(uploadErrorMessage, err);
      return respondMulterError(res, err, multerMessages, multerDefaultMessage);
    }

    const files = getFiles(req);

    if (!files || (Array.isArray(files) && files.length === 0)) {
      return res.status(400).json(errorResponse(noFileMessage));
    }

    try {
      await processFiles(req, files);
      next();
    } catch (error) {
      logUploadError(processErrorLogMessage || processErrorMessage, error);
      await cleanupUploadedFiles(files);
      return res.status(500).json(errorResponse(processErrorMessage));
    }
  });
};

const getSingleFile = (req) => req.file;
const getMultipleFiles = (req) => req.files;

/**
 * 处理单个文件上传
 */
const handleSingleUpload = (req, res, next) => {
  createUploadHandler({
    uploader: uploaders.single.single('file'),
    getFiles: getSingleFile,
    noFileMessage: '请选择要上传的文件',
    multerMessages: {
      LIMIT_FILE_SIZE: '文件大小超出限制',
      LIMIT_FILE_COUNT: '文件数量超出限制',
      LIMIT_UNEXPECTED_FILE: '意外的文件字段',
    },
    multerDefaultMessage: '文件上传失败',
    uploadErrorMessage: '文件上传错误:',
    processErrorMessage: '处理上传文件失败',
    processErrorLogMessage: '处理上传文件失败:',
    processFiles: async (request, file) => {
      const { thumbnailUrl } = await buildThumbnailUrls(request, file);
      const imageUrl = buildFileUrl(request, `uploads/panoramas/${file.filename}`);

      request.uploadedFile = {
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        imageUrl,
        thumbnailUrl,
      };
    },
  })(req, res, next);
};

/**
 * 处理视频文件上传
 */
const handleVideoUpload = (req, res, next) => {
  createUploadHandler({
    uploader: uploaders.video.single('file'),
    getFiles: getSingleFile,
    noFileMessage: '请选择要上传的文件',
    multerMessages: {
      LIMIT_FILE_SIZE: '文件大小超出限制',
      LIMIT_FILE_COUNT: '文件数量超出限制',
      LIMIT_UNEXPECTED_FILE: '意外的文件字段',
    },
    multerDefaultMessage: '文件上传失败',
    uploadErrorMessage: '视频文件上传错误:',
    processErrorMessage: '处理视频文件失败',
    processErrorLogMessage: '处理视频文件失败:',
    processFiles: async (request, file) => {
      const videoUrl = buildFileUrl(request, `uploads/videos/${file.filename}`);

      request.uploadedFile = {
        originalname: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        url: videoUrl,
      };
    },
  })(req, res, next);
};

/**
 * 处理KML文件上传
 */
const handleKmlUpload = (req, res, next) => {
  createUploadHandler({
    uploader: uploaders.kml.single('file'),
    getFiles: getSingleFile,
    noFileMessage: '请选择要上传的文件',
    multerMessages: {
      LIMIT_FILE_SIZE: '文件大小超出限制',
      LIMIT_FILE_COUNT: '文件数量超出限制',
      LIMIT_UNEXPECTED_FILE: '意外的文件字段',
    },
    multerDefaultMessage: '文件上传失败',
    uploadErrorMessage: 'KML文件上传错误:',
    processErrorMessage: '处理KML文件失败',
    processErrorLogMessage: '处理KML文件失败:',
    processFiles: async (request, file) => {
      const fileUrl = buildFileUrl(request, `uploads/kml/${file.filename}`);

      request.uploadedFile = {
        originalname: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        url: fileUrl,
      };
    },
  })(req, res, next);
};

// 底图KML上传（单独目录）
const handleBasemapKmlUpload = (req, res, next) => {
  createUploadHandler({
    uploader: uploaders.basemapKml.single('file'),
    getFiles: getSingleFile,
    noFileMessage: '请选择要上传的文件',
    multerMessages: {
      LIMIT_FILE_SIZE: '文件大小超出限制',
      LIMIT_FILE_COUNT: '文件数量超出限制',
      LIMIT_UNEXPECTED_FILE: '意外的文件字段',
    },
    multerDefaultMessage: '文件上传失败',
    uploadErrorMessage: '底图KML文件上传错误:',
    processErrorMessage: '处理底图KML文件失败',
    processErrorLogMessage: '处理底图KML文件失败:',
    processFiles: async (request, file) => {
      const fileUrl = buildFileUrl(request, `uploads/kml-basemap/${file.filename}`);

      request.uploadedFile = {
        originalname: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        url: fileUrl,
      };

      if (!request.body) request.body = {};
      request.body.isBasemap = '1';
    },
  })(req, res, next);
};

/**
 * 处理批量文件上传
 */
const handleBatchUpload = (req, res, next) => {
  createUploadHandler({
    uploader: uploaders.batch.array('files', 10),
    getFiles: getMultipleFiles,
    noFileMessage: '请选择要上传的文件',
    multerMessages: {
      LIMIT_FILE_SIZE: '文件大小超出限制',
      LIMIT_FILE_COUNT: '文件数量超出限制',
    },
    multerDefaultMessage: '批量文件上传失败',
    uploadErrorMessage: '批量文件上传错误:',
    processErrorMessage: '处理批量上传文件失败',
    processErrorLogMessage: '处理批量上传文件失败:',
    processFiles: async (request, files) => {
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const { thumbnailUrl } = await buildThumbnailUrls(request, file);

          return {
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            imageUrl: buildFileUrl(request, `uploads/panoramas/${file.filename}`),
            thumbnailUrl,
          };
        })
      );

      request.uploadedFiles = uploadedFiles;
    },
  })(req, res, next);
};

/**
 * 处理图片集上传
 */
const handleImageSetUpload = (req, res, next) => {
  createUploadHandler({
    uploader: uploaders.imageSet.array('files', 50),
    getFiles: getMultipleFiles,
    noFileMessage: '请选择要上传的图片文件',
    multerMessages: {
      LIMIT_FILE_SIZE: '文件大小超出限制',
      LIMIT_FILE_COUNT: '文件数量超出限制（最多50张）',
    },
    multerDefaultMessage: '文件上传失败',
    uploadErrorMessage: '图片集文件上传错误:',
    processErrorMessage: '处理图片集上传文件失败',
    processErrorLogMessage: '处理图片集上传文件失败:',
    processFiles: async (request, files) => {
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const { thumbnailUrl } = await buildThumbnailUrls(request, file);

          return {
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            imageUrl: buildFileUrl(request, `uploads/image-sets/${file.filename}`),
            thumbnailUrl,
          };
        })
      );

      request.uploadedFiles = uploadedFiles;
    },
  })(req, res, next);
};

/**
 * 处理添加图片到图片集
 */
const handleImageSetAddImages = (req, res, next) => {
  createUploadHandler({
    uploader: uploaders.imageSet.array('files', 50),
    getFiles: getMultipleFiles,
    noFileMessage: '请选择要上传的图片文件',
    multerMessages: {
      LIMIT_FILE_SIZE: '文件大小超出限制',
      LIMIT_FILE_COUNT: '文件数量超出限制（最多50张）',
    },
    multerDefaultMessage: '文件上传失败',
    uploadErrorMessage: '添加图片文件上传错误:',
    processErrorMessage: '处理添加图片文件失败',
    processErrorLogMessage: '处理添加图片文件失败:',
    processFiles: async (request, files) => {
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const { thumbnailUrl } = await buildThumbnailUrls(request, file);

          return {
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            imageUrl: buildFileUrl(request, `uploads/image-sets/${file.filename}`),
            thumbnailUrl,
          };
        })
      );

      request.uploadedFiles = uploadedFiles;
    },
  })(req, res, next);
};

module.exports = {
  handleSingleUpload,
  handleBatchUpload,
  handleKmlUpload,
  handleBasemapKmlUpload,
  handleVideoUpload,
  handleImageSetUpload,
  handleImageSetAddImages,
};
