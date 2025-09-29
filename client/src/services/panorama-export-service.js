import { gcj02ToWgs84 } from '@/utils/coordinate-transform.js';

/**
 * KML点位导出服务
 * 支持将KML点位数据导出为KML(WGS84)和表格格式
 */
export class KMLPointsExportService {
  /**
   * 导出点位数据为KML格式（WGS84坐标系）
   * @param {Array} kmlPoints KML点位数据数组
   * @param {string} filename 文件名（不含扩展名）
   * @param {string} title KML文档标题
   * @returns {Promise<void>}
   */
  async exportToKML(kmlPoints, filename = 'kml_points_export', title = 'KML点位数据导出') {
    if (!kmlPoints || kmlPoints.length === 0) {
      throw new Error('没有可导出的KML点位数据');
    }

    const kmlContent = this.generateKMLContent(kmlPoints, title);
    this.downloadFile(
      kmlContent,
      `${filename}.kml`,
      'application/vnd.google-earth.kml+xml;charset=utf-8'
    );
  }

  /**
   * 导出点位数据为表格格式（CSV）
   * @param {Array} kmlPoints KML点位数据数组
   * @param {string} filename 文件名（不含扩展名）
   * @returns {Promise<void>}
   */
  async exportToTable(kmlPoints, filename = 'kml_points_export') {
    if (!kmlPoints || kmlPoints.length === 0) {
      throw new Error('没有可导出的KML点位数据');
    }

    const csvContent = this.generateCSVContent(kmlPoints);
    this.downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8');
  }

  /**
   * 生成KML文件内容（使用WGS84坐标）
   * @param {Array} kmlPoints KML点位数据
   * @param {string} title 文件标题
   * @returns {string} KML文件内容
   */
  generateKMLContent(kmlPoints, title) {
    const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">
<Document>
<name>${this.escapeXML(title)}</name>
<description>导出时间: ${new Date().toLocaleString()}</description>`;

    const placemarks = kmlPoints
      .map((point) => {
        // KML点位通常已经是WGS84坐标，但为了保险起见仍做转换检查
        let wgs84Lat, wgs84Lng;

        if (point.latitude && point.longitude) {
          // KML点位的主要坐标字段
          wgs84Lat = point.latitude;
          wgs84Lng = point.longitude;
        } else if (point.wgs84_lat && point.wgs84_lng) {
          // 备用WGS84字段
          wgs84Lat = point.wgs84_lat;
          wgs84Lng = point.wgs84_lng;
        } else if (point.gcj02Lat && point.gcj02Lng) {
          // 从GCJ02转换为WGS84（少见情况）
          [wgs84Lng, wgs84Lat] = gcj02ToWgs84(point.gcj02Lng, point.gcj02Lat);
        } else if (point.lat && point.lng) {
          // 通用备用字段
          wgs84Lat = point.lat;
          wgs84Lng = point.lng;
        } else {
          return ''; // 跳过没有坐标的点
        }

        const name = point.name || point.title || `KML点位_${point.id}`;
        const description = this.generateKMLPointDescription(point);

        return `
<Placemark>
  <name>${this.escapeXML(name)}</name>
  <description>${this.escapeXML(description)}</description>
  <Point>
    <coordinates>${wgs84Lng},${wgs84Lat},${point.altitude || 0}</coordinates>
  </Point>
</Placemark>`;
      })
      .filter((placemark) => placemark) // 过滤掉空的placemark
      .join('');

    const kmlFooter = `
</Document>
</kml>`;

    return kmlHeader + placemarks + kmlFooter;
  }

  /**
   * 生成CSV文件内容
   * @param {Array} kmlPoints KML点位数据
   * @returns {string} CSV文件内容
   */
  generateCSVContent(kmlPoints) {
    // CSV头部
    const headers = [
      'ID',
      '名称',
      '描述',
      '纬度(WGS84)',
      '经度(WGS84)',
      '海拔高度',
      '来源文件',
      '文件ID',
      '点位类型',
    ];

    const csvRows = [
      headers.join(','),
      ...kmlPoints.map((point) => {
        // 获取WGS84坐标
        let wgs84Lat, wgs84Lng;

        if (point.latitude && point.longitude) {
          wgs84Lat = point.latitude;
          wgs84Lng = point.longitude;
        } else if (point.wgs84_lat && point.wgs84_lng) {
          wgs84Lat = point.wgs84_lat;
          wgs84Lng = point.wgs84_lng;
        } else if (point.gcj02Lat && point.gcj02Lng) {
          [wgs84Lng, wgs84Lat] = gcj02ToWgs84(point.gcj02Lng, point.gcj02Lat);
        } else if (point.lat && point.lng) {
          wgs84Lat = point.lat;
          wgs84Lng = point.lng;
        } else {
          wgs84Lat = '';
          wgs84Lng = '';
        }

        return [
          point.id || '',
          this.escapeCSV(point.name || point.title || ''),
          this.escapeCSV(point.description || point.desc || point.note || ''),
          wgs84Lat || '',
          wgs84Lng || '',
          point.altitude || 0,
          this.escapeCSV(point.sourceFile || ''),
          point.fileId || '',
          this.escapeCSV(point.type || 'kml'),
        ].join(',');
      }),
    ];

    // 使用CRLF换行符以便更好地兼容Windows上的Excel
    return csvRows.join('\r\n');
  }

  /**
   * 生成KML点位的描述信息
   * @param {Object} point KML点位数据
   * @returns {string} 描述信息
   */
  generateKMLPointDescription(point) {
    const parts = [];

    if (point.description || point.desc || point.note) {
      parts.push(point.description || point.desc || point.note);
    }

    if (point.sourceFile) {
      parts.push(`来源文件: ${point.sourceFile}`);
    }

    if (point.altitude) {
      parts.push(`海拔高度: ${point.altitude}米`);
    }

    if (point.id) {
      parts.push(`点位ID: ${point.id}`);
    }

    if (point.fileId) {
      parts.push(`文件ID: ${point.fileId}`);
    }

    return parts.length > 0 ? parts.join('\n') : 'KML点位';
  }

  /**
   * XML字符转义
   * @param {string} text 要转义的文本
   * @returns {string} 转义后的文本
   */
  escapeXML(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * CSV字符转义
   * @param {string} text 要转义的文本
   * @returns {string} 转义后的文本
   */
  escapeCSV(text) {
    if (!text) return '';
    const str = String(text);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * 下载文件
   * @param {string} content 文件内容
   * @param {string} filename 文件名
   * @param {string} mimeType MIME类型
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 获取导出统计信息
   * @param {Array} kmlPoints KML点位数据
   * @returns {Object} 统计信息
   */
  getExportStatistics(kmlPoints) {
    if (!kmlPoints || !Array.isArray(kmlPoints)) {
      return { totalCount: 0, validCoordinatesCount: 0 };
    }

    const validCoordinatesCount = kmlPoints.filter((point) => {
      return (
        (point.latitude && point.longitude) ||
        (point.wgs84_lat && point.wgs84_lng) ||
        (point.gcj02Lat && point.gcj02Lng) ||
        (point.lat && point.lng)
      );
    }).length;

    return {
      totalCount: kmlPoints.length,
      validCoordinatesCount,
    };
  }
}

// 创建单例实例
export const kmlPointsExportService = new KMLPointsExportService();
