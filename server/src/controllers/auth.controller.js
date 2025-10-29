const AuthService = require('../services/identity/auth.service');
const { establishSession, destroySession } = require('../services/identity/session.service');
const { successResponse, errorResponse } = require('../utils/response');
const Logger = require('../utils/logger');
const config = require('../config');

class AuthController {
  static async register(req, res) {
    try {
      const { username, password, displayName } = req.body || {};
      if (!username || !password) {
        return res.status(400).json(errorResponse('用户名和密码不能为空', 400));
      }

      const user = await AuthService.register({ username, password, displayName });
      return res.json(successResponse(user, '注册成功'));
    } catch (error) {
      Logger.warn('注册失败:', error.message);
      const status = error?.statusCode || 400;
      return res.status(status).json(errorResponse(error.message || '注册失败', status));
    }
  }

  static async login(req, res) {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json(errorResponse('用户名和密码不能为空', 400));
      }

      const user = await AuthService.validateCredentials(username, password);
      await establishSession(req, user);
      return res.json(successResponse(user, '登录成功'));
    } catch (error) {
      Logger.warn('登录失败:', error.message);
      const status = error?.statusCode || (error.message === '账号已被禁用' ? 403 : 500);
      return res.status(status).json(errorResponse(error.message || '登录失败', status));
    }
  }

  static async logout(req, res) {
    try {
      await destroySession(req);
      res.clearCookie(config.session.name);
      return res.json(successResponse(null, '已退出登录'));
    } catch (error) {
      Logger.error('退出登录失败:', error.message);
      return res.status(500).json(errorResponse('退出登录失败'));
    }
  }

  static async me(req, res) {
    if (!req.user) {
      return res.status(401).json(errorResponse('未登录', 401));
    }
    return res.json(successResponse(req.user, '获取用户信息成功'));
  }
}

module.exports = AuthController;
