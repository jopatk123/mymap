const ImageSetQueryController = require('./image-set-query.controller');
const ImageSetMutationController = require('./image-set-mutation.controller');

class ImageSetController {
  // Query methods
  static getImageSets = ImageSetQueryController.getImageSets;
  static getImageSetById = ImageSetQueryController.getImageSetById;
  static getImageSetsByBounds = ImageSetQueryController.getImageSetsByBounds;
  static getImageSetStats = ImageSetQueryController.getImageSetStats;

  // Mutation methods
  static createImageSet = ImageSetMutationController.createImageSet;
  static updateImageSet = ImageSetMutationController.updateImageSet;
  static deleteImageSet = ImageSetMutationController.deleteImageSet;
  static batchDeleteImageSets = ImageSetMutationController.batchDeleteImageSets;
  static batchUpdateVisibility = ImageSetMutationController.batchUpdateVisibility;
  static batchMoveToFolder = ImageSetMutationController.batchMoveToFolder;
  static updateVisibility = ImageSetMutationController.updateVisibility;
  static moveToFolder = ImageSetMutationController.moveToFolder;
  static addImages = ImageSetMutationController.addImages;
  static removeImage = ImageSetMutationController.removeImage;
  static updateImageOrder = ImageSetMutationController.updateImageOrder;
}

module.exports = ImageSetController;
