// 错误码和错误信息定义
module.exports = {
  // 通用错误
  COMMON: {
    INVALID_PARAMS: { code: 'INVALID_PARAMS', message: '参数无效' },
    NOT_FOUND: { code: 'NOT_FOUND', message: '资源不存在' },
    INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: '内部服务器错误' },
  },

  // 全景图相关错误
  PANORAMA: {
    NOT_FOUND: { code: 'PANORAMA_NOT_FOUND', message: '全景图不存在' },
    CREATE_FAILED: { code: 'PANORAMA_CREATE_FAILED', message: '创建全景图失败' },
    UPDATE_FAILED: { code: 'PANORAMA_UPDATE_FAILED', message: '更新全景图失败' },
    DELETE_FAILED: { code: 'PANORAMA_DELETE_FAILED', message: '删除全景图失败' },
    INVALID_COORDINATES: { code: 'INVALID_COORDINATES', message: '坐标格式无效' },
  },

  // 文件夹相关错误
  FOLDER: {
    NOT_FOUND: { code: 'FOLDER_NOT_FOUND', message: '文件夹不存在' },
    CREATE_FAILED: { code: 'FOLDER_CREATE_FAILED', message: '创建文件夹失败' },
  },

  // 坐标转换错误
  COORDINATE: {
    CONVERSION_FAILED: { code: 'COORDINATE_CONVERSION_FAILED', message: '坐标转换失败' },
    INVALID_SYSTEM: { code: 'INVALID_COORDINATE_SYSTEM', message: '不支持的坐标系' },
  },
};
