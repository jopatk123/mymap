// 服务层统一导出
const PanoramaQueryService = require('./panorama/panorama-query.service')
const PanoramaMutationService = require('./panorama/panorama-mutation.service')
const CoordinateService = require('./coordinate.service')
const VideoPointService = require('./video-point.service')

module.exports = {
  PanoramaQueryService,
  PanoramaMutationService,
  CoordinateService,
  VideoPointService
}