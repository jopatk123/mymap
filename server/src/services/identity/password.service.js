const argon2 = require('argon2');
const crypto = require('crypto');
const config = require('../../config');

const generateSalt = (size = 16) => crypto.randomBytes(size).toString('hex');

const hashPassword = async (password, salt) => {
  if (!password) throw new Error('Password is required');
  const pepper = config.security.passwordPepper || '';
  const payload = `${password}${pepper}`;
  return argon2.hash(payload, {
    type: argon2.argon2id,
    salt: Buffer.from(salt, 'hex'),
  });
};

const verifyPassword = async (hash, password, salt) => {
  if (!hash || !password || !salt) return false;
  const pepper = config.security.passwordPepper || '';
  const payload = `${password}${pepper}`;
  return argon2.verify(hash, payload, {
    salt: Buffer.from(salt, 'hex'),
  });
};

module.exports = {
  generateSalt,
  hashPassword,
  verifyPassword,
};
