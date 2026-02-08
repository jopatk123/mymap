const Joi = require('joi');
const { validationErrorResponse } = require('../utils/response');

// 全景图数据验证规则
const panoramaSchema = Joi.object({
  title: Joi.string().min(1).max(255).required().messages({
    'string.empty': '标题不能为空',
    'string.min': '标题至少需要1个字符',
    'string.max': '标题不能超过255个字符',
    'any.required': '标题是必填项',
  }),

  description: Joi.string().max(1000).allow('', null).messages({
    'string.max': '描述不能超过1000个字符',
  }),

  lat: Joi.number().min(-90).max(90).required().messages({
    'number.base': '纬度必须是数字',
    'number.min': '纬度不能小于-90',
    'number.max': '纬度不能大于90',
    'any.required': '纬度是必填项',
  }),

  lng: Joi.number().min(-180).max(180).required().messages({
    'number.base': '经度必须是数字',
    'number.min': '经度不能小于-180',
    'number.max': '经度不能大于180',
    'any.required': '经度是必填项',
  }),

  imageUrl: Joi.string().uri().required().messages({
    'string.uri': '图片URL格式不正确',
    'any.required': '图片URL是必填项',
  }),

  thumbnailUrl: Joi.string().uri().allow('', null).messages({
    'string.uri': '缩略图URL格式不正确',
  }),

  fileSize: Joi.number().integer().min(0).allow(null).messages({
    'number.base': '文件大小必须是数字',
    'number.integer': '文件大小必须是整数',
    'number.min': '文件大小不能小于0',
  }),

  fileType: Joi.string().valid('image/jpeg', 'image/png', 'image/jpg').allow('', null).messages({
    'any.only': '文件类型必须是 JPEG 或 PNG',
  }),
});

// 更新全景图数据验证规则（所有字段都是可选的）
const updatePanoramaSchema = Joi.object({
  title: Joi.string().min(1).max(255).messages({
    'string.empty': '标题不能为空',
    'string.min': '标题至少需要1个字符',
    'string.max': '标题不能超过255个字符',
  }),

  // 允许透传 folderId（可选），避免在更新其他字段时丢失归属
  folderId: Joi.number().integer().min(0).allow(null).messages({
    'number.base': 'folderId 必须是数字',
    'number.integer': 'folderId 必须是整数',
    'number.min': 'folderId 不能小于 0',
  }),

  description: Joi.string().max(1000).allow('', null).messages({
    'string.max': '描述不能超过1000个字符',
  }),

  lat: Joi.number().min(-90).max(90).messages({
    'number.base': '纬度必须是数字',
    'number.min': '纬度不能小于-90',
    'number.max': '纬度不能大于90',
  }),

  lng: Joi.number().min(-180).max(180).messages({
    'number.base': '经度必须是数字',
    'number.min': '经度不能小于-180',
    'number.max': '经度不能大于180',
  }),

  imageUrl: Joi.string().uri().messages({
    'string.uri': '图片URL格式不正确',
  }),

  thumbnailUrl: Joi.string().uri().allow('', null).messages({
    'string.uri': '缩略图URL格式不正确',
  }),
})
  .min(1)
  .messages({
    'object.min': '至少需要提供一个要更新的字段',
  });

// 搜索参数验证规则
const searchSchema = Joi.object({
  keyword: Joi.string().max(100).allow('').messages({
    'string.max': '关键词不能超过100个字符',
  }),

  lat: Joi.number().min(-90).max(90).messages({
    'number.base': '纬度必须是数字',
    'number.min': '纬度不能小于-90',
    'number.max': '纬度不能大于90',
  }),

  lng: Joi.number().min(-180).max(180).messages({
    'number.base': '经度必须是数字',
    'number.min': '经度不能小于-180',
    'number.max': '经度不能大于180',
  }),

  radius: Joi.number().integer().min(1).max(50000).messages({
    'number.base': '搜索半径必须是数字',
    'number.integer': '搜索半径必须是整数',
    'number.min': '搜索半径不能小于1米',
    'number.max': '搜索半径不能大于50000米',
  }),

  dateFrom: Joi.date().iso().messages({
    'date.format': '开始日期格式不正确，请使用ISO格式',
  }),

  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).messages({
    'date.format': '结束日期格式不正确，请使用ISO格式',
    'date.min': '结束日期不能早于开始日期',
  }),

  page: Joi.number().integer().min(1).messages({
    'number.base': '页码必须是数字',
    'number.integer': '页码必须是整数',
    'number.min': '页码不能小于1',
  }),

  pageSize: Joi.number().integer().min(1).max(500).messages({
    'number.base': '每页数量必须是数字',
    'number.integer': '每页数量必须是整数',
    'number.min': '每页数量不能小于1',
    'number.max': '每页数量不能大于500',
  }),
})
  .and('lat', 'lng')
  .messages({
    'object.and': '如果提供纬度，也必须提供经度',
  });

// 边界参数验证规则
const boundsSchema = Joi.object({
  north: Joi.number().min(-90).max(90).required().messages({
    'number.base': '北边界必须是数字',
    'number.min': '北边界不能小于-90',
    'number.max': '北边界不能大于90',
    'any.required': '北边界是必填项',
  }),

  south: Joi.number().min(-90).max(90).required().messages({
    'number.base': '南边界必须是数字',
    'number.min': '南边界不能小于-90',
    'number.max': '南边界不能大于90',
    'any.required': '南边界是必填项',
  }),

  east: Joi.number().min(-180).max(180).required().messages({
    'number.base': '东边界必须是数字',
    'number.min': '东边界不能小于-180',
    'number.max': '东边界不能大于180',
    'any.required': '东边界是必填项',
  }),

  west: Joi.number().min(-180).max(180).required().messages({
    'number.base': '西边界必须是数字',
    'number.min': '西边界不能小于-180',
    'number.max': '西边界不能大于180',
    'any.required': '西边界是必填项',
  }),
})
  .custom((value, helpers) => {
    if (value.north <= value.south) {
      return helpers.error('bounds.northSouth');
    }
    if (value.east <= value.west) {
      return helpers.error('bounds.eastWest');
    }
    return value;
  })
  .messages({
    'bounds.northSouth': '北边界必须大于南边界',
    'bounds.eastWest': '东边界必须大于西边界',
  });

/**
 * 创建验证中间件
 * @param {Joi.Schema} schema 验证规则
 * @param {string} property 要验证的属性 ('body' | 'query' | 'params')
 * @returns {Function}
 */
function createValidator(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // 返回所有错误
      stripUnknown: true, // 移除未知字段
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value,
      }));

      return res.status(400).json(validationErrorResponse(errors));
    }

    // 将验证后的值替换原始值
    req[property] = value;
    next();
  };
}

// 导出验证中间件
const validatePanoramaData = createValidator(panoramaSchema, 'body');
const validateUpdatePanoramaData = createValidator(updatePanoramaSchema, 'body');
const validateSearchParams = createValidator(searchSchema, 'query');
const validateBoundsParams = createValidator(boundsSchema, 'query');

// ID参数验证
const validateId = (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id) <= 0) {
    return res.status(400).json(
      validationErrorResponse([
        {
          field: 'id',
          message: 'ID必须是正整数',
          value: id,
        },
      ])
    );
  }

  req.params.id = parseInt(id);
  next();
};

// 批量ID验证
const validateBatchIds = (req, res, next) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json(
      validationErrorResponse([
        {
          field: 'ids',
          message: 'ids必须是非空数组',
          value: ids,
        },
      ])
    );
  }

  const validIds = [];
  const errors = [];

  ids.forEach((id, index) => {
    if (isNaN(id) || parseInt(id) <= 0) {
      errors.push({
        field: `ids[${index}]`,
        message: 'ID必须是正整数',
        value: id,
      });
    } else {
      validIds.push(parseInt(id));
    }
  });

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  if (validIds.length === 0) {
    return res.status(400).json(
      validationErrorResponse([
        {
          field: 'ids',
          message: '没有有效的ID',
          value: ids,
        },
      ])
    );
  }

  req.body.ids = validIds;
  next();
};

// 批量移动参数验证
const validateBatchMoveParams = (req, res, next) => {
  const { ids, folderId } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json(
      validationErrorResponse([
        {
          field: 'ids',
          message: 'ids必须是非空数组',
          value: ids,
        },
      ])
    );
  }

  // folderId 可以是 null（移动到根目录）或正整数
  if (folderId !== null && folderId !== undefined) {
    if (isNaN(folderId) || parseInt(folderId) < 0) {
      return res.status(400).json(
        validationErrorResponse([
          {
            field: 'folderId',
            message: 'folderId必须是正整数或null',
            value: folderId,
          },
        ])
      );
    }
  }

  const validIds = [];
  const errors = [];

  ids.forEach((id, index) => {
    if (isNaN(id) || parseInt(id) <= 0) {
      errors.push({
        field: `ids[${index}]`,
        message: 'ID必须是正整数',
        value: id,
      });
    } else {
      validIds.push(parseInt(id));
    }
  });

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  if (validIds.length === 0) {
    return res.status(400).json(
      validationErrorResponse([
        {
          field: 'ids',
          message: '没有有效的ID',
          value: ids,
        },
      ])
    );
  }

  req.body.ids = validIds;
  req.body.folderId =
    folderId !== undefined ? (folderId !== null ? parseInt(folderId) : null) : null;
  next();
};

/**
 * 验证上传时必须指定有效的 folderId
 * 确保用户上传文件时选择了一个文件夹
 */
const validateRequiredFolderId = async (req, res, next) => {
  const { folderId } = req.body;
  const ownerId = req.user?.id;

  // 检查 folderId 是否提供
  if (folderId === undefined || folderId === null || folderId === '' || folderId === 0) {
    return res.status(400).json(
      validationErrorResponse([
        {
          field: 'folderId',
          message: '请选择一个文件夹后再上传文件',
          value: folderId,
        },
      ])
    );
  }

  const parsedFolderId = parseInt(folderId);
  if (isNaN(parsedFolderId) || parsedFolderId <= 0) {
    return res.status(400).json(
      validationErrorResponse([
        {
          field: 'folderId',
          message: '无效的文件夹ID',
          value: folderId,
        },
      ])
    );
  }

  // 验证文件夹是否存在且属于当前用户
  try {
    const FolderModel = require('../models/folder.model');
    const folder = await FolderModel.findById(parsedFolderId, ownerId);
    
    if (!folder) {
      return res.status(400).json(
        validationErrorResponse([
          {
            field: 'folderId',
            message: '文件夹不存在或无权访问',
            value: folderId,
          },
        ])
      );
    }

    req.body.folderId = parsedFolderId;
    next();
  } catch (error) {
    return res.status(500).json(
      validationErrorResponse([
        {
          field: 'folderId',
          message: '验证文件夹时发生错误',
          value: folderId,
        },
      ])
    );
  }
};

module.exports = {
  validatePanoramaData,
  validateUpdatePanoramaData,
  validateSearchParams,
  validateBoundsParams,
  validateId,
  validateBatchIds,
  validateBatchMoveParams,
  createValidator,
  validateRequiredFolderId,
};
