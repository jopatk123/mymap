const SQLiteAdapter = require('../utils/sqlite-adapter');
const { wgs84ToGcj02 } = require('../utils/coordinate');

class KmlPointModel {
  static async create({
    kmlFileId,
    name,
    description,
    latitude,
    longitude,
    altitude = 0,
    pointType = 'Point',
    coordinates,
    styleData,
  }) {
    try {
      const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(longitude, latitude);
      const [result] = await SQLiteAdapter.execute(
        `INSERT INTO kml_points (
          kml_file_id, name, description, latitude, longitude, 
          gcj02_lat, gcj02_lng, altitude, point_type, coordinates, style_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          kmlFileId,
          name,
          description,
          latitude,
          longitude,
          gcj02Lat || null,
          gcj02Lng || null,
          altitude,
          pointType,
          JSON.stringify(coordinates),
          JSON.stringify(styleData),
        ]
      );
      return await this.findById(result.insertId);
    } catch (error) {
      const Logger = require('../utils/logger');
      Logger.error('创建KML点位失败:', error);
      throw error;
    }
  }

  static async batchCreate(points) {
    try {
      if (!Array.isArray(points) || points.length === 0) {
        return [];
      }
      const values = [];
      const params = [];
      for (const point of points) {
        const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(point.longitude, point.latitude);
        values.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        params.push(
          point.kmlFileId,
          point.name || '',
          point.description || '',
          point.latitude,
          point.longitude,
          gcj02Lat || null,
          gcj02Lng || null,
          point.altitude || 0,
          point.pointType || 'Point',
          JSON.stringify(point.coordinates || {}),
          JSON.stringify(point.styleData || {})
        );
      }
      const sql = `INSERT INTO kml_points (
        kml_file_id, name, description, latitude, longitude, 
        gcj02_lat, gcj02_lng, altitude, point_type, coordinates, style_data
      ) VALUES ${values.join(', ')}`;
      const result = await SQLiteAdapter.run(sql, params);
      return result.changes || 0;
    } catch (error) {
      const Logger = require('../utils/logger');
      Logger.error('批量创建KML点位失败:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const rows = await SQLiteAdapter.all(
        `SELECT kp.*, kf.title as kml_file_title 
         FROM kml_points kp 
         LEFT JOIN kml_files kf ON kp.kml_file_id = kf.id 
         WHERE kp.id = ?`,
        [id]
      );
      if (rows[0]) {
        rows[0].coordinates = JSON.parse(rows[0].coordinates || '{}');
        rows[0].style_data = JSON.parse(rows[0].style_data || '{}');
      }
      return rows[0] || null;
    } catch (error) {
      const Logger = require('../utils/logger');
      Logger.error('查找KML点位失败:', error);
      throw error;
    }
  }

  static async findByKmlFileId(kmlFileId) {
    try {
      const rows = await SQLiteAdapter.all(
        `SELECT kp.*, kf.title as kml_file_title 
         FROM kml_points kp 
         LEFT JOIN kml_files kf ON kp.kml_file_id = kf.id 
         WHERE kp.kml_file_id = ?
         ORDER BY kp.id ASC`,
        [kmlFileId]
      );
      return rows.map((row) => ({
        ...row,
        coordinates: JSON.parse(row.coordinates || '{}'),
        style_data: JSON.parse(row.style_data || '{}'),
      }));
    } catch (error) {
      const Logger = require('../utils/logger');
      Logger.error('根据KML文件ID查找点位失败:', error);
      throw error;
    }
  }

  static async findByBounds({ north, south, east, west } = {}) {
    try {
      const rows = await SQLiteAdapter.all(
        `SELECT kp.*, kf.title as kml_file_title, kf.is_visible as kml_file_visible
         FROM kml_points kp 
         LEFT JOIN kml_files kf ON kp.kml_file_id = kf.id 
         WHERE kp.gcj02_lat BETWEEN ? AND ? 
         AND kp.gcj02_lng BETWEEN ? AND ?
         AND kf.is_visible = TRUE
         ORDER BY kp.id ASC`,
        [south, north, west, east]
      );
      return rows.map((row) => ({
        ...row,
        coordinates: JSON.parse(row.coordinates || '{}'),
        style_data: JSON.parse(row.style_data || '{}'),
      }));
    } catch (error) {
      const Logger = require('../utils/logger');
      Logger.error('根据边界查找KML点位失败:', error);
      throw error;
    }
  }

  static async deleteByKmlFileId(kmlFileId) {
    try {
      const [result] = await SQLiteAdapter.execute(
        'DELETE FROM kml_points WHERE kml_file_id = ?',
        [kmlFileId]
      );
      return result.affectedRows;
    } catch (error) {
      const Logger = require('../utils/logger');
      Logger.error('删除KML文件点位失败:', error);
      throw error;
    }
  }

  static async getStatsByKmlFileId(kmlFileId) {
    try {
      const rows = await SQLiteAdapter.all(
        `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN point_type = 'Point' THEN 1 END) as points,
          COUNT(CASE WHEN point_type = 'LineString' THEN 1 END) as lines,
          COUNT(CASE WHEN point_type = 'Polygon' THEN 1 END) as polygons
        FROM kml_points 
        WHERE kml_file_id = ?
      `,
        [kmlFileId]
      );
      return rows[0];
    } catch (error) {
      const Logger = require('../utils/logger');
      Logger.error('获取KML点位统计失败:', error);
      throw error;
    }
  }

  static async getStats() {
    try {
      const rows = await SQLiteAdapter.all(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN point_type = 'Point' THEN 1 END) as points,
          COUNT(CASE WHEN point_type = 'LineString' THEN 1 END) as lines,
          COUNT(CASE WHEN point_type = 'Polygon' THEN 1 END) as polygons
        FROM kml_points kp
        LEFT JOIN kml_files kf ON kp.kml_file_id = kf.id
        WHERE kf.is_visible = TRUE
      `);
      return rows[0];
    } catch (error) {
      const Logger = require('../utils/logger');
      Logger.error('获取KML点位统计失败:', error);
      throw error;
    }
  }
}

module.exports = KmlPointModel;
