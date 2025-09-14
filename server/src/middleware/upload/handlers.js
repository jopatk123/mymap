const multer = require('multer');
const path = require('path');
const { uploaders } = require('./storage');
const { generateThumbnail, buildFileUrl, cleanupFiles } = require('./utils');
const { uploadDir } = require('./config');
const { errorResponse } = require('../../utils/response');

/**
 * 处理单个文件上传
 */
const handleSingleUpload = (req, res, next) => {
  uploaders.single.single('file')(req, res, async (err) => {
    if (err) {
      console.error('文件上传错误:', err);

      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json(errorResponse('文件大小超出限制'));
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json(errorResponse('文件数量超出限制'));
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json(errorResponse('意外的文件字段'));
          default:
            return res.status(400).json(errorResponse('文件上传失败'));
        }
      }

      return res.status(400).json(errorResponse(err.message));
    }

    if (!req.file) {
      return res.status(400).json(errorResponse('请选择要上传的文件'));
    }

    try {
      // 生成缩略图
      const thumbnailDir = path.join(uploadDir, 'thumbnails');
      const thumbnailFilename = `thumb-${req.file.filename}`;
      const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

      const thumbnailGenerated = await generateThumbnail(req.file.path, thumbnailPath);

      // 构建文件URL
      const imageUrl = buildFileUrl(req, `uploads/panoramas/${req.file.filename}`);
      const thumbnailUrl = thumbnailGenerated
        ? buildFileUrl(req, `uploads/thumbnails/${thumbnailFilename}`)
        : null;

      // 将文件信息添加到请求对象
      req.uploadedFile = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        imageUrl,
        thumbnailUrl,
      };

      next();
    } catch (error) {
      console.error('处理上传文件失败:', error);

      // 清理已上传的文件
      await cleanupFiles(req.file.path);

      return res.status(500).json(errorResponse('处理上传文件失败'));
    }
  });
};

/**
 * 处理视频文件上传
 */
const handleVideoUpload = (req, res, next) => {
  uploaders.video.single('file')(req, res, async (err) => {
    if (err) {
      console.error('视频文件上传错误:', err);

      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json(errorResponse('文件大小超出限制'));
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json(errorResponse('文件数量超出限制'));
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json(errorResponse('意外的文件字段'));
          default:
            return res.status(400).json(errorResponse('文件上传失败'));
        }
      }

      return res.status(400).json(errorResponse(err.message));
    }

    if (!req.file) {
      return res.status(400).json(errorResponse('请选择要上传的文件'));
    }

    try {
      // 构建文件URL
      const videoUrl = buildFileUrl(req, `uploads/videos/${req.file.filename}`);

      // 将文件信息添加到请求对象
      req.uploadedFile = {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: videoUrl,
      };

      next();
    } catch (error) {
      console.error('处理视频文件失败:', error);

      // 清理已上传的文件
      await cleanupFiles(req.file.path);

      return res.status(500).json(errorResponse('处理视频文件失败'));
    }
  });
};

/**
 * 处理KML文件上传
 */
const handleKmlUpload = (req, res, next) => {
  uploaders.kml.single('file')(req, res, async (err) => {
    if (err) {
      console.error('KML文件上传错误:', err);

      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json(errorResponse('文件大小超出限制'));
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json(errorResponse('文件数量超出限制'));
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json(errorResponse('意外的文件字段'));
          default:
            return res.status(400).json(errorResponse('文件上传失败'));
        }
      }

      return res.status(400).json(errorResponse(err.message));
    }

    if (!req.file) {
      return res.status(400).json(errorResponse('请选择要上传的文件'));
    }

    try {
      // 构建文件URL
      const fileUrl = buildFileUrl(req, `uploads/kml/${req.file.filename}`);

      // 将文件信息添加到请求对象
      req.uploadedFile = {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl,
      };

      next();
    } catch (error) {
      console.error('处理KML文件失败:', error);

      // 清理已上传的文件
      await cleanupFiles(req.file.path);

      return res.status(500).json(errorResponse('处理KML文件失败'));
    }
  });
};

// 底图KML上传（单独目录）
const handleBasemapKmlUpload = (req, res, next) => {
  uploaders.basemapKml.single('file')(req, res, async (err) => {
    if (err) {
      console.error('底图KML文件上传错误:', err);
      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json(errorResponse('文件大小超出限制'));
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json(errorResponse('文件数量超出限制'));
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json(errorResponse('意外的文件字段'));
          default:
            return res.status(400).json(errorResponse('文件上传失败'));
        }
      }
      return res.status(400).json(errorResponse(err.message));
    }
    if (!req.file) {
      return res.status(400).json(errorResponse('请选择要上传的文件'));
    }
    try {
      const fileUrl = buildFileUrl(req, `uploads/kml-basemap/${req.file.filename}`);
      req.uploadedFile = {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl,
      };
      if (!req.body) req.body = {};
      req.body.isBasemap = '1';
      next();
    } catch (error) {
      console.error('处理底图KML文件失败:', error);
      await cleanupFiles(req.file.path);
      return res.status(500).json(errorResponse('处理底图KML文件失败'));
    }
  });
};

/**
 * 处理批量文件上传
 */
const handleBatchUpload = (req, res, next) => {
  uploaders.batch.array('files', 10)(req, res, async (err) => {
    if (err) {
      console.error('批量文件上传错误:', err);

      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json(errorResponse('文件大小超出限制'));
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json(errorResponse('文件数量超出限制'));
          default:
            return res.status(400).json(errorResponse('批量文件上传失败'));
        }
      }

      return res.status(400).json(errorResponse(err.message));
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json(errorResponse('请选择要上传的文件'));
    }

    try {
      const thumbnailDir = path.join(uploadDir, 'thumbnails');

      // 处理每个上传的文件
      const uploadedFiles = await Promise.all(
        req.files.map(async (file) => {
          // 生成缩略图
          const thumbnailFilename = `thumb-${file.filename}`;
          const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

          const thumbnailGenerated = await generateThumbnail(file.path, thumbnailPath);

          return {
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            imageUrl: buildFileUrl(req, `uploads/panoramas/${file.filename}`),
            thumbnailUrl: thumbnailGenerated
              ? buildFileUrl(req, `uploads/thumbnails/${thumbnailFilename}`)
              : null,
          };
        })
      );

      req.uploadedFiles = uploadedFiles;
      next();
    } catch (error) {
      console.error('处理批量上传文件失败:', error);

      // 清理已上传的文件
      if (req.files) {
        await cleanupFiles(req.files.map((file) => file.path));
      }

      return res.status(500).json(errorResponse('处理批量上传文件失败'));
    }
  });
};

module.exports = {
  handleSingleUpload,
  handleBatchUpload,
  handleKmlUpload,
  handleBasemapKmlUpload,
  handleVideoUpload,
};
