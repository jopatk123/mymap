// 坐标系相关常量
module.exports = {
  // 坐标系类型
  COORDINATE_SYSTEMS: {
    WGS84: 'wgs84',
    GCJ02: 'gcj02',
    BD09: 'bd09',
  },

  // 坐标范围验证
  COORDINATE_BOUNDS: {
    LATITUDE: { MIN: -90, MAX: 90 },
    LONGITUDE: { MIN: -180, MAX: 180 },
  },

  // 地球半径（米）
  EARTH_RADIUS: 6371000,
};
