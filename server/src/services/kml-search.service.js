const Logger = require('../utils/logger');
const SQLiteAdapter = require('../utils/sqlite-adapter');
const fs = require('fs');
const path = require('path');

class KMLSearchService {
  // 将 controller 传入的 files 参数（可能是字符串或数组）解析为数字型 fileId 列表
  static parseFileIds(files = []) {
    const arr = Array.isArray(files) ? files : files ? [files] : [];
    const ids = [];
    for (const f of arr) {
      if (typeof f === 'number' && Number.isInteger(f)) ids.push(f);
      else if (typeof f === 'string' && /^\d+$/.test(f)) ids.push(parseInt(f, 10));
      // 其他格式（如路径、标题）暂不支持DB过滤，后续可扩展
    }
    return ids;
  }

  // DB 搜索：仅针对 is_basemap=1（且可见）的 KML 文件
  static async searchKMLPoints(keyword, files = [], options = {}) {
    try {
      const limit = parseInt(options.limit, 10) || 100;
      const offset = parseInt(options.offset, 10) || 0;

      if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
        return [];
      }

      const kw = keyword.trim().toLowerCase();
      const like = `%${kw}%`;
      const fileIds = this.parseFileIds(files);

      const where = [
        'kf.is_basemap = 1',
        'kf.is_visible = 1',
        '(LOWER(kp.name) LIKE ? OR LOWER(kp.description) LIKE ?)',
      ];
      const params = [like, like];

      if (fileIds.length > 0) {
        where.push(`kp.kml_file_id IN (${fileIds.map(() => '?').join(',')})`);
        params.push(...fileIds);
      }

      const sql = `
        SELECT 
          kp.id AS point_id,
          kp.kml_file_id,
          kp.name,
          kp.description,
          kp.latitude,
          kp.longitude,
          kp.altitude,
          kp.coordinates,
          kf.title AS kml_file_title,
          kf.file_url AS kml_file_url
        FROM kml_points kp
        JOIN kml_files kf ON kp.kml_file_id = kf.id
        WHERE ${where.join(' AND ')}
        ORDER BY kp.id ASC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);

      const rows = await SQLiteAdapter.all(sql, params);

      // 仅返回物理文件仍然存在的点位（满足“实际存在的 KML 底图文件”）
      const filtered = rows.filter((r) => {
        const url = r.kml_file_url || '';
        const abs = url ? path.join(process.cwd(), url.replace(/^\/+/, '')) : null;
        try {
          return abs && fs.existsSync(abs);
        } catch (_) {
          return false;
        }
      });

      const results = filtered.map((r) => {
        // 解析坐标JSON（有些历史数据可能是字符串）
        let coords = {};
        try {
          coords = typeof r.coordinates === 'string' ? JSON.parse(r.coordinates) : r.coordinates || {};
        } catch (_) {
          coords = {};
        }
        const nameLc = (r.name || '').toLowerCase();
        const descLc = (r.description || '').toLowerCase();
        return {
          id: `kml-${r.kml_file_id}-${r.point_id}`,
          name: r.name || '',
          description: r.description || '',
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          altitude: Number(r.altitude || 0),
          coordinates: coords,
          sourceFile: r.kml_file_title || '',
          fileId: r.kml_file_id,
          matchedFields: {
            name: nameLc.includes(kw),
            description: descLc.includes(kw),
          },
        };
      });

      return results;
    } catch (error) {
      Logger.error('搜索KML点位失败(DB):', error);
      throw new Error(`搜索KML点位失败: ${error.message}`);
    }
  }

  // 获取所有 basemap KML 的点位（可选按 fileIds 过滤）
  static async getAllKMLPoints(files = []) {
    try {
      const fileIds = this.parseFileIds(files);
      const where = ['kf.is_basemap = 1', 'kf.is_visible = 1'];
      const params = [];
      if (fileIds.length > 0) {
        where.push(`kp.kml_file_id IN (${fileIds.map(() => '?').join(',')})`);
        params.push(...fileIds);
      }

      const sql = `
        SELECT 
          kp.id AS point_id,
          kp.kml_file_id,
          kp.name,
          kp.description,
          kp.latitude,
          kp.longitude,
          kp.altitude,
          kp.coordinates,
          kf.title AS kml_file_title,
          kf.file_url AS kml_file_url
        FROM kml_points kp
        JOIN kml_files kf ON kp.kml_file_id = kf.id
        WHERE ${where.join(' AND ')}
        ORDER BY kp.id ASC
      `;

      const rows = await SQLiteAdapter.all(sql, params);

      const filtered = rows.filter((r) => {
        const url = r.kml_file_url || '';
        const abs = url ? path.join(process.cwd(), url.replace(/^\/+/, '')) : null;
        try {
          return abs && fs.existsSync(abs);
        } catch (_) {
          return false;
        }
      });

      return filtered.map((r) => {
        let coords = {};
        try {
          coords = typeof r.coordinates === 'string' ? JSON.parse(r.coordinates) : r.coordinates || {};
        } catch (_) {
          coords = {};
        }
        return {
          id: `kml-${r.kml_file_id}-${r.point_id}`,
          name: r.name || '',
          description: r.description || '',
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          altitude: Number(r.altitude || 0),
          coordinates: coords,
          sourceFile: r.kml_file_title || '',
          fileId: r.kml_file_id,
        };
      });
    } catch (error) {
      Logger.error('获取所有KML点位失败(DB):', error);
      throw new Error(`获取所有KML点位失败: ${error.message}`);
    }
  }
}

module.exports = KMLSearchService;
