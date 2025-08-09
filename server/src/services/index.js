// 服务层统一导出
const PanoramaQueryService = require('./panorama/panoramaQuery.service')
const PanoramaMutationService = require('./panorama/panoramaMutation.service')
const CoordinateService = require('./coordinate.service')
const VideoPointService = require('./videoPoint.service')

module.exports = {
  PanoramaQueryService,
  PanoramaMutationService,
  CoordinateService,
  VideoPointService
}