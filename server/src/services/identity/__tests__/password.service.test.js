const PasswordService = require('../password.service');

describe('PasswordService', () => {
  describe('generateSalt', () => {
    it('应该生成 32 字符的盐值', () => {
      const salt = PasswordService.generateSalt();
      expect(salt).toHaveLength(32);
    });

    it('每次生成的盐值应该不同', () => {
      const salt1 = PasswordService.generateSalt();
      const salt2 = PasswordService.generateSalt();
      expect(salt1).not.toBe(salt2);
    });
  });

  describe('hashPassword', () => {
    it('应该生成密码哈希', async () => {
      const password = 'testPassword123';
      const salt = PasswordService.generateSalt();

      const hash = await PasswordService.hashPassword(password, salt);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      // argon2 哈希以 $argon2 开头
      expect(hash).toMatch(/^\$argon2/);
    });

    it('相同密码和盐值应该生成相同的哈希', async () => {
      const password = 'testPassword123';
      const salt = PasswordService.generateSalt(); // 使用正确长度的盐值

      const hash1 = await PasswordService.hashPassword(password, salt);
      const hash2 = await PasswordService.hashPassword(password, salt);

      expect(hash1).toBe(hash2);
    });

    it('不同盐值应该生成不同的哈希', async () => {
      const password = 'testPassword123';
      const salt1 = PasswordService.generateSalt();
      const salt2 = PasswordService.generateSalt();

      const hash1 = await PasswordService.hashPassword(password, salt1);
      const hash2 = await PasswordService.hashPassword(password, salt2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('正确密码应该验证通过', async () => {
      const password = 'correctPassword123';
      const salt = PasswordService.generateSalt();
      const hash = await PasswordService.hashPassword(password, salt);

      // 注意参数顺序: (hash, password, salt)
      const isValid = await PasswordService.verifyPassword(hash, password, salt);

      expect(isValid).toBe(true);
    });

    it('错误密码应该验证失败', async () => {
      const password = 'correctPassword123';
      const wrongPassword = 'wrongPassword456';
      const salt = PasswordService.generateSalt();
      const hash = await PasswordService.hashPassword(password, salt);

      // 注意参数顺序: (hash, password, salt)
      const isValid = await PasswordService.verifyPassword(hash, wrongPassword, salt);

      expect(isValid).toBe(false);
    });

    it('缺少参数时应返回 false', async () => {
      const password = 'testPassword123';
      const salt = PasswordService.generateSalt();
      const hash = await PasswordService.hashPassword(password, salt);

      expect(await PasswordService.verifyPassword(null, password, salt)).toBe(false);
      expect(await PasswordService.verifyPassword(hash, null, salt)).toBe(false);
      expect(await PasswordService.verifyPassword(hash, password, null)).toBe(false);
    });
  });
});
