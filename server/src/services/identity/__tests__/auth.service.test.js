const AuthService = require('../auth.service');
const PasswordService = require('../password.service');
const { getPrisma } = require('../../../config/prisma');

// Mock Prisma
jest.mock('../../../config/prisma', () => ({
  getPrisma: jest.fn(),
}));

// Mock database
jest.mock('../../../config/database', () => ({
  initTables: jest.fn().mockResolvedValue(undefined),
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('AuthService', () => {
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    getPrisma.mockReturnValue(mockPrisma);
  });

  describe('normalizeUsername', () => {
    it('应该将用户名转换为小写并去除空格', () => {
      expect(AuthService.normalizeUsername('  Admin  ')).toBe('admin');
      expect(AuthService.normalizeUsername('USER123')).toBe('user123');
    });

    it('应该处理空输入', () => {
      expect(AuthService.normalizeUsername('')).toBe('');
      expect(AuthService.normalizeUsername(null)).toBe('');
      expect(AuthService.normalizeUsername(undefined)).toBe('');
    });
  });

  describe('findByUsername', () => {
    it('应该根据用户名查找用户', async () => {
      const mockUser = { id: 1, username: 'testuser' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await AuthService.findByUsername('TestUser');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
      expect(result).toEqual(mockUser);
    });

    it('空用户名应返回 null', async () => {
      const result = await AuthService.findByUsername('');
      expect(result).toBeNull();
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('应该根据 ID 获取用户并排除敏感信息', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        hashedPassword: 'secret_hash',
        salt: 'secret_salt',
        displayName: 'Test User',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await AuthService.getUserById(1);

      expect(result).toEqual({
        id: 1,
        username: 'testuser',
        displayName: 'Test User',
      });
      expect(result).not.toHaveProperty('hashedPassword');
      expect(result).not.toHaveProperty('salt');
    });

    it('无效 ID 应返回 null', async () => {
      const result = await AuthService.getUserById(null);
      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    it('应该成功注册新用户', async () => {
      const mockUser = {
        id: 1,
        username: 'newuser',
        hashedPassword: 'hashed',
        salt: 'salt123',
        displayName: 'New User',
        role: 'user',
      };
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await AuthService.register({
        username: 'NewUser',
        password: 'password123',
        displayName: 'New User',
      });

      expect(result).toEqual({
        id: 1,
        username: 'newuser',
        displayName: 'New User',
        role: 'user',
      });
    });

    it('用户名已存在时应抛出错误', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, username: 'existinguser' });

      await expect(
        AuthService.register({
          username: 'existinguser',
          password: 'password123',
        })
      ).rejects.toThrow('用户名已被占用');
    });

    it('用户名或密码为空时应抛出错误', async () => {
      await expect(
        AuthService.register({
          username: '',
          password: 'password123',
        })
      ).rejects.toThrow('用户名和密码不能为空');

      await expect(
        AuthService.register({
          username: 'testuser',
          password: '',
        })
      ).rejects.toThrow('用户名和密码不能为空');
    });

    it('用户名包含空格时应抛出错误', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        AuthService.register({
          username: 'user name',
          password: 'password123',
        })
      ).rejects.toThrow('用户名不能包含空格');
    });
  });

  describe('validateCredentials', () => {
    it('用户名或密码为空时应抛出错误', async () => {
      await expect(AuthService.validateCredentials('', 'password')).rejects.toThrow(
        '用户名和密码不能为空'
      );

      await expect(AuthService.validateCredentials('username', '')).rejects.toThrow(
        '用户名和密码不能为空'
      );
    });

    it('用户不存在时应抛出错误', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(AuthService.validateCredentials('nonexistent', 'password')).rejects.toThrow(
        '用户名不存在'
      );
    });
  });
});
