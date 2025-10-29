/* global jest */
const fs = require('fs');
const os = require('os');
const path = require('path');

const baseDir = path.join(__dirname, '..', '..');

const resolveModule = (modulePath) => require(path.join(baseDir, modulePath));

async function withTempDatabase(testFn, { autoInit = true } = {}) {
  const originalDbPath = process.env.DB_PATH;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mymap-db-'));
  process.env.DB_PATH = path.join(tempDir, 'test.db');
  process.env.DATABASE_URL = `file:${process.env.DB_PATH}`;
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.PASSWORD_PEPPER = 'test-pepper';
  process.env.NODE_ENV = 'test';

  jest.resetModules();

  const database = resolveModule('config/database');

  if (autoInit) {
    await database.initTables();
  }

  const context = {
    database,
    tempDir,
    load: (relativePath) => resolveModule(relativePath),
    resolve: (relativePath) => path.join(baseDir, relativePath),
  };

  try {
    return await testFn(context);
  } finally {
    await database.closeDatabase();
    try {
      const { getPrisma } = resolveModule('config/prisma');
      await getPrisma().$disconnect();
    } catch (_) {
      // ignore disconnect errors in tests
    }

    process.env.DB_PATH = originalDbPath;
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.NODE_ENV = originalNodeEnv;

    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    jest.resetModules();
  }
}

module.exports = {
  withTempDatabase,
};
