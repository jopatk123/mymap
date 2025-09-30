const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

class ConfigRepository {
  constructor(options = {}) {
    this.fs = options.fs || fs;
    this.fsPromises = options.fsPromises || fsPromises;
    this.path = options.path || path;
    this.logger = options.logger;
    this.configPath =
      options.configPath || this.path.join(__dirname, '../../config/app-config.json');
    this.cache = {
      config: null,
      mtime: null,
    };
  }

  getConfigPath() {
    return this.configPath;
  }

  async read(defaultConfigProvider) {
    try {
      const stats = await this.fsPromises.stat(this.configPath);
      if (this.cache.config && this.cache.mtime && stats.mtime <= this.cache.mtime) {
        return this.cache.config;
      }

      const data = await this.fsPromises.readFile(this.configPath, 'utf8');
      const parsed = JSON.parse(data);
      this.cache = { config: parsed, mtime: stats.mtime };
      return parsed;
    } catch (error) {
      if (error.code === 'ENOENT') {
        if (typeof defaultConfigProvider === 'function') {
          const defaultConfig = defaultConfigProvider();
          await this.write(defaultConfig);
          return defaultConfig;
        }
      }
      throw error;
    }
  }

  async write(newConfig) {
    const configDir = this.path.dirname(this.configPath);
    await this.ensureDirectory(configDir);

    const tmpPath = `${this.configPath}.${process.pid}.${Date.now()}.tmp`;
    const payload = JSON.stringify(newConfig, null, 2);

    const maxAttempts = 3;
    let lastErr = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        await this.fsPromises.writeFile(tmpPath, payload, { encoding: 'utf8' });
        await this.fsPromises.rename(tmpPath, this.configPath);
        this.cache = { config: newConfig, mtime: new Date() };
        return true;
      } catch (error) {
        lastErr = error;
        if (attempt === maxAttempts - 1) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 50 : 150));
      }
    }

    try {
      await this.fsPromises.unlink(tmpPath);
    } catch (cleanupError) {
      // ignore
    }

    if (this.logger && typeof this.logger.error === 'function') {
      this.logger.error('[ConfigRepository] Failed to save config', lastErr);
    }

    return false;
  }

  async ensureDirectory(dir) {
    try {
      await this.fsPromises.access(dir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await this.fsPromises.mkdir(dir, { recursive: true });
      } else {
        throw error;
      }
    }
  }
}

module.exports = ConfigRepository;
