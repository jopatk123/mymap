const express = require('express');
const SuperAdminController = require('../controllers/super-admin.controller');
const { requireSuperAdmin } = require('../middleware/super-admin.middleware');

const router = express.Router();

// 超级管理员登录（不需要验证）
router.post('/login', SuperAdminController.login);

// 以下路由需要超级管理员权限
router.post('/logout', requireSuperAdmin, SuperAdminController.logout);
router.get('/check', SuperAdminController.checkAuth);
router.get('/users', requireSuperAdmin, SuperAdminController.getAllUsers);
router.post('/users', requireSuperAdmin, SuperAdminController.createUser);
router.put('/users/:userId/password', requireSuperAdmin, SuperAdminController.forceChangePassword);
router.put('/users/:userId/toggle-active', requireSuperAdmin, SuperAdminController.toggleUserActive);

module.exports = router;
