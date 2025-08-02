const PanoramaQueryController = require('./panorama/panoramaQuery.controller')
const PanoramaMutationController = require('./panorama/panoramaMutation.controller')
const PanoramaUtilsController = require('./panorama/panoramaUtils.controller')

/**
 * 全景图控制器 - 统一入口
 * 按功能拆分为查询、变更和工具类控制器
 */
class PanoramaController {
  // 查询相关方法
  static getPanoramas = PanoramaQueryController.getPanoramas
  static getPanoramaById = PanoramaQueryController.getPanoramaById
  static getPanoramasByBounds = PanoramaQueryController.getPanoramasByBounds
  static getNearbyPanoramas = PanoramaQueryController.getNearbyPanoramas
  static searchPanoramas = PanoramaQueryController.searchPanoramas
  static getStats = PanoramaQueryController.getStats

  // 变更相关方法
  static createPanorama = PanoramaMutationController.createPanorama
  static updatePanorama = PanoramaMutationController.updatePanorama
  static deletePanorama = PanoramaMutationController.deletePanorama
  static batchDeletePanoramas = PanoramaMutationController.batchDeletePanoramas

  // 工具相关方法
  static convertCoordinate = PanoramaUtilsController.convertCoordinate
}

module.exports = PanoramaController