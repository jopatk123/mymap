const VideoPointQueryController = require('./videoPoint/videoPointQuery.controller')
const VideoPointMutationController = require('./videoPoint/videoPointMutation.controller')

/**
 * 视频点位控制器 - 统一入口
 * 按功能拆分为查询和变更控制器
 * 保持API兼容性，内部结构优化
 */
class VideoPointController {
  // 查询相关方法
  static getVideoPoints = VideoPointQueryController.getVideoPoints
  static getVideoPointById = VideoPointQueryController.getVideoPointById
  static getVideoPointsByBounds = VideoPointQueryController.getVideoPointsByBounds
  static getVideoPointStats = VideoPointQueryController.getVideoPointStats

  // 变更相关方法
  static createVideoPoint = VideoPointMutationController.createVideoPoint
  static updateVideoPoint = VideoPointMutationController.updateVideoPoint
  static deleteVideoPoint = VideoPointMutationController.deleteVideoPoint
  static batchDeleteVideoPoints = VideoPointMutationController.batchDeleteVideoPoints
  static batchMoveVideoPointsToFolder = VideoPointMutationController.batchMoveVideoPointsToFolder
  static batchUpdateVideoPointVisibility = VideoPointMutationController.batchUpdateVideoPointVisibility
  static updateVideoPointVisibility = VideoPointMutationController.updateVideoPointVisibility
  static moveVideoPointToFolder = VideoPointMutationController.moveVideoPointToFolder
}

module.exports = VideoPointController