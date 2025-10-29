const { getPrisma } = require('../../config/prisma');
const { initTables } = require('../../config/database');
const PasswordService = require('./password.service');
const Logger = require('../../utils/logger');

class AuthError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

const sanitizeUser = (user) => {
  if (!user) return null;
  const { hashedPassword: _hashedPassword, salt: _salt, ...safe } = user;
  return safe;
};

let usersTableReady = false;
const ensureUsersTable = async () => {
  if (usersTableReady) return;
  try {
    await initTables();
    usersTableReady = true;
  } catch (error) {
    Logger.warn('初始化用户表失败:', error.message);
    throw error;
  }
};

class AuthService {
  static normalizeUsername(username) {
    if (!username) return '';
    return String(username).trim().toLowerCase();
  }

  static async findByUsername(username) {
    const normalizedUsername = this.normalizeUsername(username);
    if (!normalizedUsername) return null;
    const prisma = getPrisma();
    return prisma.user.findUnique({ where: { username: normalizedUsername } });
  }

  static async getUserById(id) {
    if (!id) return null;
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id } });
    return sanitizeUser(user);
  }

  static async register(payload) {
    const { username, password, displayName, role = 'user' } = payload;
    if (!username || !password) {
      throw new AuthError('用户名和密码不能为空');
    }

    const normalizedUsername = this.normalizeUsername(username);
    if (!normalizedUsername) {
      throw new AuthError('用户名格式不正确');
    }

    await ensureUsersTable();

    const prisma = getPrisma();

    if (normalizedUsername.includes(' ')) {
      throw new AuthError('用户名不能包含空格');
    }

    const existing = await prisma.user.findUnique({ where: { username: normalizedUsername } });
    if (existing) {
      throw new AuthError('用户名已被占用', 409);
    }

    const salt = PasswordService.generateSalt();
    const hashedPassword = await PasswordService.hashPassword(password, salt);
    const safeDisplayName = displayName ? String(displayName).trim() || null : null;

    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        hashedPassword,
        salt,
        displayName: safeDisplayName,
        role,
      },
    });

    Logger.info(`新用户已注册: ${normalizedUsername}`);
    return sanitizeUser(user);
  }

  static async validateCredentials(username, password) {
    if (!username || !password) {
      throw new AuthError('用户名和密码不能为空');
    }

    await ensureUsersTable();

    const prismaUser = await this.findByUsername(username);
    if (!prismaUser) {
      throw new AuthError('用户名不存在', 404);
    }

    if (!prismaUser.isActive) {
      throw new AuthError('账号已被禁用', 403);
    }

    const match = await PasswordService.verifyPassword(
      prismaUser.hashedPassword,
      password,
      prismaUser.salt
    );

    if (!match) {
      throw new AuthError('密码错误', 401);
    }

    return sanitizeUser(prismaUser);
  }

  static async changePassword(userId, newPassword) {
    if (!userId || !newPassword) {
      throw new Error('参数无效');
    }

    const prisma = getPrisma();
    const salt = PasswordService.generateSalt();
    const hashedPassword = await PasswordService.hashPassword(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: {
        hashedPassword,
        salt,
      },
    });

    Logger.info(`用户 ${userId} 已更新密码`);
    return true;
  }

  static sanitize(user) {
    return sanitizeUser(user);
  }
}

module.exports = AuthService;
