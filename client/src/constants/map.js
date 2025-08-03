// 地图配置常量
export const MAP_CONFIG = {
  // 默认中心点（北京）
  DEFAULT_CENTER: [39.9042, 116.4074],
  
  // 默认缩放级别
  DEFAULT_ZOOM: 10,
  MIN_ZOOM: 3,
  MAX_ZOOM: 18,
  
  // 地图类型
  MAP_TYPES: {
    NORMAL: 'normal',
    SATELLITE: 'satellite',
    HYBRID: 'hybrid'
  },
  
  // 标记点样式
  MARKER_STYLES: {
    DEFAULT: {
      fillColor: '#409EFF',
      strokeColor: '#ffffff',
      strokeWidth: 2,
      radius: 8
    },
    SELECTED: {
      fillColor: '#F56C6C',
      strokeColor: '#ffffff',
      strokeWidth: 3,
      radius: 10
    }
  },
  
  // 搜索半径选项（米）
  SEARCH_RADIUS_OPTIONS: [
    { label: '100米', value: 100 },
    { label: '500米', value: 500 },
    { label: '1公里', value: 1000 },
    { label: '5公里', value: 5000 },
    { label: '10公里', value: 10000 }
  ]
}