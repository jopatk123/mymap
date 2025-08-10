const VideoPointQueryController = require('./video-point/video-point-query.controller')
const VideoPointMutationController = require('./video-point/video-point-mutation.controller')

class VideoPointController {
  static getVideoPoints = VideoPointQueryController.getVideoPoints
  static getVideoPointById = VideoPointQueryController.getVideoPointById
  static getVideoPointsByBounds = VideoPointQueryController.getVideoPointsByBounds
  static getVideoPointStats = VideoPointQueryController.getVideoPointStats

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


