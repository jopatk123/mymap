const Logger = require('../../utils/logger');

const establishSession = (req, user) => {
  return new Promise((resolve, reject) => {
    if (!req || !req.session) {
      return reject(new Error('无法创建会话'));
    }
    req.session.regenerate((regenErr) => {
      if (regenErr) {
        Logger.error('会话重建失败:', regenErr);
        return reject(regenErr);
      }
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.save((saveErr) => {
        if (saveErr) {
          Logger.error('会话保存失败:', saveErr);
          return reject(saveErr);
        }
        resolve();
      });
    });
  });
};

const destroySession = (req) => {
  return new Promise((resolve, reject) => {
    if (!req || !req.session) return resolve();
    req.session.destroy((err) => {
      if (err) {
        Logger.error('会话销毁失败:', err);
        return reject(err);
      }
      resolve();
    });
  });
};

module.exports = {
  establishSession,
  destroySession,
};
