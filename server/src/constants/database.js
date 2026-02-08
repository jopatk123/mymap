// 数据库相关常量
module.exports = {
  // 分页默认值
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 500,

  // 排序字段
  ALLOWED_SORT_FIELDS: {
    PANORAMA: ['created_at', 'title', 'latitude', 'longitude', 'sort_order'],
    FOLDER: ['created_at', 'name', 'sort_order'],
  },

  // 排序方向
  SORT_ORDERS: ['ASC', 'DESC'],

  // 搜索限制
  MAX_SEARCH_RADIUS: 50000, // 50km
  MIN_SEARCH_RADIUS: 100, // 100m

  // 批量操作限制
  MAX_BATCH_SIZE: 100,
};
