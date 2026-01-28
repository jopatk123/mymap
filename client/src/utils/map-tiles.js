import L from 'leaflet';

// 创建GCJ02坐标参考系统
export const GCJ02CRS = L.extend({}, L.CRS.EPSG3857, {
  code: 'GCJ02',
  // 保持与EPSG3857相同的投影和变换，只是标识为GCJ02
});

/**
 * 创建高德地图瓦片层
 * @param {string} type 地图类型 'normal' | 'satellite' | 'roadnet'
 * @returns {L.TileLayer}
 */
export function createAMapTileLayer(type = 'normal') {
  // 临时使用OSM瓦片测试坐标是否正确
  if (type === 'test') {
    return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    });
  }

  const urls = {
    normal:
      'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    satellite: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
    roadnet: 'https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}',
  };

  return L.tileLayer(urls[type], {
    subdomains: ['1', '2', '3', '4'],
    attribution: '© 高德地图',
    maxZoom: 18,
  });
}
