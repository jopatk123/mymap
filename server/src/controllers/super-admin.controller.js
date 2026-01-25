const AuthService = require('../services/identity/auth.service');
const { getPrisma } = require('../config/prisma');
const { successResponse, errorResponse } = require('../utils/response');
const Logger = require('../utils/logger');

// 超级管理员密码（硬编码）
const SUPER_ADMIN_PASSWORD = 'asd123123123';

class SuperAdminController {
  /**
   * 超级管理员登录验证
   */
  static async login(req, res) {
    try {
      const { password } = req.body || {};
      
      if (!password) {
        return res.status(400).json(errorResponse('请输入管理员密码', 400));
      }

      if (password !== SUPER_ADMIN_PASSWORD) {
        return res.status(401).json(errorResponse('管理员密码错误', 401));
      }

      // 设置超级管理员session标识
      req.session.isSuperAdmin = true;
      
      Logger.info('超级管理员登录成功');
      return res.json(successResponse({ authenticated: true }, '超级管理员登录成功'));
    } catch (error) {
      Logger.error('超级管理员登录失败:', error.message);
      return res.status(500).json(errorResponse('登录失败', 500));
    }
  }

  /**
   * 超级管理员登出
   */
  static async logout(req, res) {
    try {
      if (req.session) {
        delete req.session.isSuperAdmin;
      }
      Logger.info('超级管理员已登出');
      return res.json(successResponse(null, '已退出超级管理员模式'));
    } catch (error) {
      Logger.error('超级管理员登出失败:', error.message);
      return res.status(500).json(errorResponse('登出失败', 500));
    }
  }

  /**
   * 检查超级管理员登录状态
   */
  static async checkAuth(req, res) {
    try {
      const isAuthenticated = req.session && req.session.isSuperAdmin === true;
      return res.json(successResponse({ authenticated: isAuthenticated }, '获取状态成功'));
    } catch (error) {
      Logger.error('检查超级管理员状态失败:', error.message);
      return res.status(500).json(errorResponse('检查状态失败', 500));
    }
  }

  /**
   * 获取所有用户列表（包含密码信息 - 仅供超级管理员查看）
   */
  static async getAllUsers(req, res) {
    try {
      const prisma = getPrisma();
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      });

      // 返回用户信息（注意：这里会包含敏感信息，仅限超级管理员访问）
      const userList = users.map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // 注意：这里我们不返回真实的明文密码（因为存储的是哈希），
        // 但我们可以显示哈希密码的部分信息用于确认
        hasPassword: Boolean(user.hashedPassword),
      }));

      return res.json(successResponse(userList, '获取用户列表成功'));
    } catch (error) {
      Logger.error('获取用户列表失败:', error.message);
      return res.status(500).json(errorResponse('获取用户列表失败', 500));
    }
  }

  /**
   * 强制修改用户密码
   */
  static async forceChangePassword(req, res) {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body || {};

      if (!userId) {
        return res.status(400).json(errorResponse('用户ID不能为空', 400));
      }

      if (!newPassword) {
        return res.status(400).json(errorResponse('新密码不能为空', 400));
      }

      if (newPassword.length < 6) {
        return res.status(400).json(errorResponse('密码长度不能少于6位', 400));
      }

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
      
      if (!user) {
        return res.status(404).json(errorResponse('用户不存在', 404));
      }

      await AuthService.changePassword(parseInt(userId), newPassword);

      Logger.info(`超级管理员强制修改了用户 ${user.username} 的密码`);
      return res.json(successResponse(null, `已成功修改用户 ${user.username} 的密码`));
    } catch (error) {
      Logger.error('强制修改密码失败:', error.message);
      return res.status(500).json(errorResponse('修改密码失败', 500));
    }
  }

  /**
   * 创建新用户
   */
  static async createUser(req, res) {
    try {
      const { username, password, displayName, role = 'user' } = req.body || {};

      if (!username || !password) {
        return res.status(400).json(errorResponse('用户名和密码不能为空', 400));
      }

      if (password.length < 6) {
        return res.status(400).json(errorResponse('密码长度不能少于6位', 400));
      }

      const user = await AuthService.register({
        username,
        password,
        displayName,
        role,
      });

      Logger.info(`超级管理员创建了新用户: ${username}`);
      return res.status(201).json(successResponse(user, '用户创建成功'));
    } catch (error) {
      Logger.error('创建用户失败:', error.message);
      const status = error?.statusCode || 500;
      return res.status(status).json(errorResponse(error.message || '创建用户失败', status));
    }
  }

  /**
   * 切换用户激活状态
   */
  static async toggleUserActive(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json(errorResponse('用户ID不能为空', 400));
      }

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
      
      if (!user) {
        return res.status(404).json(errorResponse('用户不存在', 404));
      }

      const updatedUser = await prisma.user.update({
        where: { id: parseInt(userId) },
        data: { isActive: !user.isActive },
      });

      const statusText = updatedUser.isActive ? '启用' : '禁用';
      Logger.info(`超级管理员${statusText}了用户 ${user.username}`);
      return res.json(
        successResponse({ isActive: updatedUser.isActive }, `已${statusText}用户 ${user.username}`)
      );
    } catch (error) {
      Logger.error('切换用户状态失败:', error.message);
      return res.status(500).json(errorResponse('操作失败', 500));
    }
  }
}

module.exports = SuperAdminController;
