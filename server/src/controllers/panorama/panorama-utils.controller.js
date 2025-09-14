const { CoordinateService } = require('../../services');
const { successResponse, errorResponse } = require('../../utils/response');

class PanoramaUtilsController {
  static async convertCoordinate(req, res) {
    try {
      const { lat, lng, from = 'wgs84', to = 'gcj02' } = req.query;
      if (!lat || !lng) {
        return res.status(400).json(errorResponse('缺少坐标参数'));
      }
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const supportedSystems = ['wgs84', 'gcj02', 'bd09'];
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json(errorResponse('坐标参数超出有效范围'));
      }
      if (!supportedSystems.includes(from) || !supportedSystems.includes(to)) {
        return res.status(400).json(errorResponse('不支持的坐标系'));
      }
      const result = CoordinateService.convertCoordinate(latitude, longitude, from, to);
      res.json(successResponse(result, '坐标转换成功'));
    } catch (error) {
      res.status(500).json(errorResponse(error.message));
    }
  }
}

module.exports = PanoramaUtilsController;
