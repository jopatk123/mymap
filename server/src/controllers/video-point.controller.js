const VideoPointQueryController = require('./videoPoint/videoPointQuery.controller')
const VideoPointMutationController = require('./videoPoint/videoPointMutation.controller')

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


