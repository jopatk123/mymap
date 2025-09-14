const PanoramaQueryController = require('./panorama/panorama-query.controller');
const PanoramaMutationController = require('./panorama/panorama-mutation.controller');
const PanoramaUtilsController = require('./panorama/panorama-utils.controller');

/**
 * 全景图控制器 - 统一入口
 * 按功能拆分为查询、变更和工具类控制器
 */
class PanoramaController {
  // 查询相关方法
  static getPanoramas = PanoramaQueryController.getPanoramas;
  static getPanoramaById = PanoramaQueryController.getPanoramaById;
  static getPanoramasByBounds = PanoramaQueryController.getPanoramasByBounds;
  static getNearbyPanoramas = PanoramaQueryController.getNearbyPanoramas;
  static searchPanoramas = PanoramaQueryController.searchPanoramas;
  static getStats = PanoramaQueryController.getStats;

  // 变更相关方法
  static createPanorama = PanoramaMutationController.createPanorama;
  static updatePanorama = PanoramaMutationController.updatePanorama;
  static deletePanorama = PanoramaMutationController.deletePanorama;
  static batchDeletePanoramas = PanoramaMutationController.batchDeletePanoramas;
  static movePanoramaToFolder = PanoramaMutationController.movePanoramaToFolder;
  static batchMovePanoramasToFolder = PanoramaMutationController.batchMovePanoramasToFolder;
  static updatePanoramaVisibility = PanoramaMutationController.updatePanoramaVisibility;
  static batchUpdatePanoramaVisibility = PanoramaMutationController.batchUpdatePanoramaVisibility;

  // 工具相关方法
  static convertCoordinate = PanoramaUtilsController.convertCoordinate;
}

module.exports = PanoramaController;
