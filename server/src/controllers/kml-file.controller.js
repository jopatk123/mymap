// 统一导出所有KML相关控制器，保持向后兼容
const KmlFileBaseController = require('./kml-file/base.controller')
const KmlFileBatchController = require('./kml-file-batch.controller')
const KmlFileStyleController = require('./kml-file-style.controller')
const KmlPointQueryController = require('./kml-point-query.controller')

const KmlFileController = {
  // 基础CRUD
  getKmlFiles: KmlFileBaseController.getKmlFiles,
  getKmlFileById: KmlFileBaseController.getKmlFileById,
  uploadKmlFile: KmlFileBaseController.uploadKmlFile,
  validateKmlFile: KmlFileBaseController.validateKmlFile,
  updateKmlFile: KmlFileBaseController.updateKmlFile,
  deleteKmlFile: KmlFileBaseController.deleteKmlFile,
  getKmlFileStats: KmlFileBaseController.getKmlFileStats,

  // 批量操作
  batchDeleteKmlFiles: KmlFileBatchController.batchDeleteKmlFiles,
  batchUpdateKmlFileVisibility: KmlFileBatchController.batchUpdateKmlFileVisibility,
  batchMoveKmlFilesToFolder: KmlFileBatchController.batchMoveKmlFilesToFolder,
  updateKmlFileVisibility: KmlFileBatchController.updateKmlFileVisibility,
  moveKmlFileToFolder: KmlFileBatchController.moveKmlFileToFolder,

  // 样式配置
  getKmlFileStyles: KmlFileStyleController.getKmlFileStyles,
  updateKmlFileStyles: KmlFileStyleController.updateKmlFileStyles,
  resetKmlFileStyles: KmlFileStyleController.resetKmlFileStyles,
  batchUpdateKmlFileStyles: KmlFileStyleController.batchUpdateKmlFileStyles,

  // 点位查询
  getKmlFilePoints: KmlPointQueryController.getKmlFilePoints,
  getKmlPointsByBounds: KmlPointQueryController.getKmlPointsByBounds
}

module.exports = KmlFileController


