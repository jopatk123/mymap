/* global jest */
const fs = require('fs');
const os = require('os');
const path = require('path');

const baseDir = path.join(__dirname, '..', '..');

const resolveModule = (modulePath) => require(path.join(baseDir, modulePath));

async function withTempDatabase(testFn, { autoInit = true } = {}) {
  const originalDbPath = process.env.DB_PATH;
  const originalNodeEnv = process.env.NODE_ENV;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mymap-db-'));
  process.env.DB_PATH = path.join(tempDir, 'test.db');
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

    process.env.DB_PATH = originalDbPath;
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
