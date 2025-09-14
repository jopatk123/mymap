const { wgs84ToGcj02, gcj02ToWgs84 } = require('../utils/coordinate-transform');
const Formatters = require('../utils/formatters');
const Validators = require('../utils/validators');
const Logger = require('../utils/logger');
const { COORDINATE_SYSTEMS } = require('../constants/coordinates');
const { COORDINATE } = require('../constants/errors');

class CoordinateService {
  // 坐标转换服务
  static convertCoordinate(lat, lng, from = 'wgs84', to = 'gcj02') {
    try {
      Logger.debug('坐标转换', { lat, lng, from, to });

      // 验证坐标
      const coordValidation = Validators.validateCoordinate(lat, lng);
      if (!coordValidation.valid) {
        throw new Error(coordValidation.message);
      }

      // 验证坐标系
      const fromSystem = from.toLowerCase();
      const toSystem = to.toLowerCase();

      if (
        !Object.values(COORDINATE_SYSTEMS).includes(fromSystem) ||
        !Object.values(COORDINATE_SYSTEMS).includes(toSystem)
      ) {
        throw new Error(COORDINATE.INVALID_SYSTEM.message);
      }

      let result = { lat: coordValidation.latitude, lng: coordValidation.longitude };

      // 执行坐标转换
      if (fromSystem === COORDINATE_SYSTEMS.WGS84 && toSystem === COORDINATE_SYSTEMS.GCJ02) {
        const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(
          coordValidation.longitude,
          coordValidation.latitude
        );
        result = { lat: gcj02Lat, lng: gcj02Lng };
      } else if (fromSystem === COORDINATE_SYSTEMS.GCJ02 && toSystem === COORDINATE_SYSTEMS.WGS84) {
        const [wgs84Lng, wgs84Lat] = gcj02ToWgs84(
          coordValidation.longitude,
          coordValidation.latitude
        );
        result = { lat: wgs84Lat, lng: wgs84Lng };
      }

      return Formatters.formatCoordinateConversion(
        { lat: coordValidation.latitude, lng: coordValidation.longitude },
        result,
        fromSystem,
        toSystem
      );
    } catch (error) {
      Logger.error('坐标转换失败', error);
      throw new Error(`${COORDINATE.CONVERSION_FAILED.message}: ${error.message}`);
    }
  }

  // 批量坐标转换
  static batchConvertCoordinates(coordinates, from = 'wgs84', to = 'gcj02') {
    try {
      Logger.debug('批量坐标转换', { count: coordinates.length, from, to });

      if (!Array.isArray(coordinates)) {
        throw new Error('坐标数据必须为数组');
      }

      return coordinates.map((coord) => {
        if (!coord.lat || !coord.lng) {
          throw new Error('坐标数据格式错误');
        }
        return this.convertCoordinate(coord.lat, coord.lng, from, to);
      });
    } catch (error) {
      Logger.error('批量坐标转换失败', error);
      throw new Error(`批量坐标转换失败: ${error.message}`);
    }
  }
}

module.exports = CoordinateService;
