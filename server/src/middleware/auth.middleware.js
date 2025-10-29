const AuthService = require('../services/identity/auth.service');
const { errorResponse } = require('../utils/response');
const Logger = require('../utils/logger');

const attachUser = async (req, res, next) => {
  try {
    if (req.user) return next();
    const sessionUserId = req.session && req.session.userId;
    if (!sessionUserId) return next();

    const user = await AuthService.getUserById(sessionUserId);
    if (!user || user.isActive === false) {
      if (req.session) {
        delete req.session.userId;
        delete req.session.role;
      }
      return next();
    }

    req.user = user;
    return next();
  } catch (error) {
    Logger.error('加载用户信息失败:', error);
    return next();
  }
};

const requireAuth = async (req, res, next) => {
  if (!req.user) {
    await attachUser(req, res, () => {});
  }

  if (!req.user) {
    return res.status(401).json(errorResponse('请先登录', 401));
  }

  return next();
};

module.exports = {
  attachUser,
  requireAuth,
};
