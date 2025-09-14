class Formatters {
  // 格式化全景图数据
  static formatPanorama(panorama) {
    if (!panorama) return null;

    return {
      id: panorama.id,
      title: panorama.title,
      description: panorama.description,
      imageUrl: panorama.image_url,
      thumbnailUrl: panorama.thumbnail_url,
      lat: parseFloat(panorama.latitude),
      lng: parseFloat(panorama.longitude),
      gcj02Lat: panorama.gcj02_lat ? parseFloat(panorama.gcj02_lat) : null,
      gcj02Lng: panorama.gcj02_lng ? parseFloat(panorama.gcj02_lng) : null,
      fileSize: panorama.file_size,
      fileType: panorama.file_type,
      folderId: panorama.folder_id,
      isVisible: panorama.is_visible,
      sortOrder: panorama.sort_order,
      createdAt: panorama.created_at,
      updatedAt: panorama.updated_at,
      folderName: panorama.folder_name || null,
      distance: panorama.distance ? Math.round(panorama.distance) : null,
    };
  }

  // 批量格式化全景图数据
  static formatPanoramas(panoramas) {
    if (!Array.isArray(panoramas)) return [];
    return panoramas.map(this.formatPanorama);
  }

  // 格式化分页响应
  static formatPaginatedResponse(data, pagination) {
    return {
      data: this.formatPanoramas(data),
      pagination: {
        page: parseInt(pagination.page),
        pageSize: parseInt(pagination.pageSize),
        total: parseInt(pagination.total),
        totalPages: Math.ceil(pagination.total / pagination.pageSize),
      },
    };
  }

  // 格式化坐标转换结果
  static formatCoordinateConversion(original, converted, fromSystem, toSystem) {
    return {
      original: {
        lat: parseFloat(original.lat),
        lng: parseFloat(original.lng),
        system: fromSystem,
      },
      converted: {
        lat: parseFloat(converted.lat),
        lng: parseFloat(converted.lng),
        system: toSystem,
      },
    };
  }

  // 格式化错误响应
  static formatError(error, code = 'INTERNAL_ERROR') {
    return {
      success: false,
      error: {
        code,
        message: error.message || '未知错误',
      },
    };
  }

  // 格式化成功响应
  static formatSuccess(data, message = '操作成功') {
    return {
      success: true,
      message,
      data,
    };
  }
}

module.exports = Formatters;
