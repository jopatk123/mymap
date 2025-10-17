const fs = require('fs');
const path = require('path');
const os = require('os');
const ConfigRepository = require('../config/config.repository');

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'config-repo-'));

describe('ConfigRepository', () => {
  let tempDir;
  let configPath;
  let repository;

  const readConfigFile = () => JSON.parse(fs.readFileSync(configPath, 'utf8'));

  beforeEach(() => {
    tempDir = makeTempDir();
    configPath = path.join(tempDir, 'app-config.json');
    repository = new ConfigRepository({ configPath });
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('writes configuration atomically and caches subsequent reads', async () => {
    const payload = { feature: { enabled: true } };
    const writeResult = await repository.write(payload);

    expect(writeResult).toBe(true);
    expect(readConfigFile()).toEqual(payload);

    const firstRead = await repository.read();
    const secondRead = await repository.read();

    expect(firstRead).toEqual(payload);
    expect(secondRead).toBe(firstRead);
  });

  it('initializes missing config using provided default', async () => {
    const defaultConfig = { hello: 'world' };

    const fetched = await repository.read(() => defaultConfig);

    expect(fetched).toEqual(defaultConfig);
    expect(readConfigFile()).toEqual(defaultConfig);
  });

  it('returns false and logs when persistent write fails', async () => {
    const errors = [];
    const failingRepository = new ConfigRepository({
      configPath,
      fsPromises: {
        writeFile: jest.fn(() => Promise.resolve()),
        rename: jest.fn(() => Promise.reject(new Error('boom'))),
        unlink: jest.fn(() => Promise.resolve()),
        access: jest.fn(() => Promise.resolve()),
        mkdir: jest.fn(() => Promise.resolve()),
        stat: jest.fn(() =>
          Promise.reject(Object.assign(new Error('missing'), { code: 'ENOENT' }))
        ),
        readFile: jest.fn(),
      },
      logger: { error: (message, err) => errors.push({ message, err }) },
      path,
    });

    const result = await failingRepository.write({ foo: 'bar' });

    expect(result).toBe(false);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch('[ConfigRepository]');
  });
});
