const { errorResponse } = require('../utils/response');

/**
 * 验证超级管理员身份的中间件
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.session || req.session.isSuperAdmin !== true) {
    return res.status(401).json(errorResponse('需要超级管理员权限', 401));
  }
  return next();
};

module.exports = {
  requireSuperAdmin,
};
