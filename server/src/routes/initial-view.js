const express = require('express')
const router = express.Router()
const InitialViewController = require('../controllers/initial-view.controller')

// 获取初始显示设置
router.get('/', InitialViewController.getInitialViewSettings)

// 更新初始显示设置
router.put('/', InitialViewController.updateInitialViewSettings)

// 重置初始显示设置
router.post('/reset', InitialViewController.resetInitialViewSettings)

module.exports = router