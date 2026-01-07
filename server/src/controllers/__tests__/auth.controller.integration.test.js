/**
 * 认证控制器集成测试
 */
const request = require('supertest');
const { getPrisma } = require('../../config/prisma');
const AuthService = require('../../services/identity/auth.service');

// 使用真实的 app，但在测试环境中
const app = require('../../app');

describe('Auth Controller - 集成测试', () => {
  let testUser;

  beforeAll(async () => {
    // 确保测试用户不存在
    const prisma = getPrisma();
    await prisma.user.deleteMany({ where: { username: 'integrationtest' } });
  });

  afterAll(async () => {
    // 清理测试用户
    const prisma = getPrisma();
    await prisma.user.deleteMany({ where: { username: 'integrationtest' } });
  });

  describe('POST /api/auth/register', () => {
    it('应该成功注册新用户', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'integrationtest',
          password: 'testPassword123',
        });

      // 注册成功返回 200 或 201
      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      // data 可能是 { user: {...} } 或直接是用户对象
      const user = res.body.data.user || res.body.data;
      expect(user.username).toBe('integrationtest');
      expect(user).not.toHaveProperty('hashedPassword');
      expect(user).not.toHaveProperty('salt');

      testUser = user;
    });

    it('重复用户名应该返回 409', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'integrationtest',
          password: 'anotherPassword',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('空用户名或密码应该返回 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: '',
          password: 'password',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('正确凭证应该登录成功', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'integrationtest',
          password: 'testPassword123',
        });

      // 登录成功返回 200
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // data 可能是 { user: {...} } 或直接是用户对象
      const user = res.body.data.user || res.body.data;
      expect(user.username).toBe('integrationtest');
    });

    it('错误密码应该返回 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'integrationtest',
          password: 'wrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('不存在的用户应该返回 404', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistentuser',
          password: 'password',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('未登录应该返回 401', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('登录后应该能获取用户信息', async () => {
      const agent = request.agent(app);

      // 先登录
      await agent
        .post('/api/auth/login')
        .send({
          username: 'integrationtest',
          password: 'testPassword123',
        });

      // 获取用户信息
      const res = await agent.get('/api/auth/me');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe('integrationtest');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('登录后应该能成功登出', async () => {
      const agent = request.agent(app);

      // 先登录
      await agent
        .post('/api/auth/login')
        .send({
          username: 'integrationtest',
          password: 'testPassword123',
        });

      // 登出
      const res = await agent.post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // 验证已登出
      const meRes = await agent.get('/api/auth/me');
      expect(meRes.status).toBe(401);
    });
  });
});
