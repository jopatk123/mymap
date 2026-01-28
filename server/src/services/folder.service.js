const FolderModel = require('../models/folder.model');
const PanoramaModel = require('../models/panorama.model');
const Logger = require('../utils/logger');

async function addContentCountRecursive(folderList, ownerId) {
  for (const folder of folderList) {
    folder.panoramaCount = parseInt(await FolderModel.getPanoramaCount(folder.id, ownerId));
    folder.videoPointCount = parseInt(await FolderModel.getVideoPointCount(folder.id, ownerId));
    folder.kmlFileCount = parseInt(await FolderModel.getKmlFileCount(folder.id, ownerId));
    folder.imageSetCount = parseInt(await FolderModel.getImageSetCount(folder.id, ownerId));
    folder.totalCount =
      folder.panoramaCount + folder.videoPointCount + folder.kmlFileCount + folder.imageSetCount;
    if (folder.children) {
      await addContentCountRecursive(folder.children);
    }
  }
}

async function addContentCountFlat(folders, ownerId) {
  for (const folder of folders) {
    folder.panoramaCount = parseInt(await FolderModel.getPanoramaCount(folder.id, ownerId));
    folder.videoPointCount = parseInt(await FolderModel.getVideoPointCount(folder.id, ownerId));
    folder.kmlFileCount = parseInt(await FolderModel.getKmlFileCount(folder.id, ownerId));
    folder.imageSetCount = parseInt(await FolderModel.getImageSetCount(folder.id, ownerId));
    folder.totalCount =
      folder.panoramaCount + folder.videoPointCount + folder.kmlFileCount + folder.imageSetCount;
  }
}

async function resolveFolderIdParam({ folderId, includeSubfolders, ownerId }) {
  let folderIdParam = folderId === '0' ? 0 : parseInt(folderId) || null;
  const includeChildren = includeSubfolders === 'true' || includeSubfolders === true;

  if (includeChildren) {
    if (folderIdParam === 0 || folderIdParam === null) {
      const allFolders = await FolderModel.findAllFlat(ownerId);
      const allFolderIds = allFolders.map((f) => f.id);
      folderIdParam = [0, ...allFolderIds];
    } else {
      const descendantIds = await FolderModel.getDescendantIds(folderIdParam, ownerId);
      folderIdParam = descendantIds.length > 0 ? descendantIds : [folderIdParam];
    }
  }

  return folderIdParam;
}

function normalizeKeyword(keyword) {
  return keyword !== undefined && keyword !== null ? String(keyword).trim() : '';
}

async function fetchFolderContents({
  ownerId,
  fileType,
  searchParams,
  includeBasemap,
  basemapOnly,
}) {
  let allResults = [];

  if (fileType === 'all' || fileType === 'panorama') {
    try {
      const panoramaResult = await PanoramaModel.findAll(searchParams);
      const panoramasWithType = panoramaResult.data.map((item) => ({
        ...item,
        fileType: 'panorama',
        displayType: '全景图',
        type: 'panorama',
      }));
      allResults = allResults.concat(panoramasWithType);
    } catch (error) {
      Logger.error('获取全景图数据失败:', error);
      Logger.error('全景图查询失败，跳过: %s', error.message);
    }
  }

  if (fileType === 'all' || fileType === 'video') {
    try {
      const VideoPointModel = require('../models/video-point.model');
      const videoResult = await VideoPointModel.findAll(searchParams);
      const videosWithType = videoResult.data.map((item) => ({
        ...item,
        fileType: 'video',
        displayType: '视频点位',
        type: 'video',
      }));
      allResults = allResults.concat(videosWithType);
    } catch (error) {
      Logger.error('获取视频点位数据失败:', error);
      Logger.error('视频点位查询失败，跳过: %s', error.message);
    }
  }

  if (fileType === 'all' || fileType === 'kml') {
    try {
      const KmlFileModel = require('../models/kml-file.model');
      const kmlResult = await KmlFileModel.findAll({
        ...searchParams,
        includeBasemap,
        basemapOnly,
      });
      const kmlsWithType = kmlResult.data.map((item) => ({
        ...item,
        fileType: 'kml',
        displayType: 'KML文件',
        type: 'kml',
        latitude: null,
        longitude: null,
        lat: null,
        lng: null,
        image_url: item.file_url,
        url: item.file_url,
      }));
      allResults = allResults.concat(kmlsWithType);
    } catch (error) {
      Logger.error('获取KML文件数据失败:', error);
      Logger.error('KML文件查询失败，跳过: %s', error.message);
    }
  }

  if (fileType === 'all' || fileType === 'image-set') {
    try {
      const ImageSetModel = require('../models/image-set.model');
      const imageSetResult = await ImageSetModel.findAll(searchParams);
      const imageSetsWithType = imageSetResult.data.map((item) => ({
        ...item,
        fileType: 'image-set',
        displayType: '图片集',
        type: 'image-set',
        image_url: item.cover_url,
        url: item.cover_url,
      }));
      allResults = allResults.concat(imageSetsWithType);
    } catch (error) {
      Logger.error('获取图片集数据失败:', error);
      Logger.error('图片集查询失败，跳过: %s', error.message);
    }
  }

  return allResults;
}

module.exports = {
  addContentCountRecursive,
  addContentCountFlat,
  resolveFolderIdParam,
  normalizeKeyword,
  fetchFolderContents,
};
