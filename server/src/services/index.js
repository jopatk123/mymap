// 服务层统一导出
const PanoramaQueryService = require('./panorama/panoramaQuery.service')
const PanoramaMutationService = require('./panorama/panoramaMutation.service')
const CoordinateService = require('./coordinate.service')

module.exports = {
  PanoramaQueryService,
  PanoramaMutationService,
  CoordinateService
}