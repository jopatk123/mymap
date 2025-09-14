const express = require('express');
const FolderController = require('../controllers/folder.controller');

const router = express.Router();

// 获取文件夹树
router.get('/', FolderController.getFolders);

// 获取文件夹列表（平铺）
router.get('/flat', FolderController.getFoldersFlat);

// 创建文件夹
router.post('/', FolderController.createFolder);

// 更新文件夹
router.put('/:id', FolderController.updateFolder);

// 删除文件夹
router.delete('/:id', FolderController.deleteFolder);

// 移动文件夹
router.patch('/:id/move', FolderController.moveFolder);

// 更新文件夹可见性
router.patch('/:id/visibility', FolderController.updateFolderVisibility);

// 获取文件夹中的全景图
router.get('/:id/panoramas', FolderController.getFolderPanoramas);

// 移动全景图到文件夹
router.post('/:folderId/panoramas', FolderController.movePanoramasToFolder);

// 获取文件夹内容
router.get('/:folderId/contents', FolderController.getFolderContents);

module.exports = router;
