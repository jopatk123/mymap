// Lightweight logger wrapper for front-end
// - Respects import.meta.env.DEV for debug logging
// - VITE_LOG_LEVEL can override default level (debug, info, warn, error, silent)
const levels = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

function getDefaultLevel() {
  if (import.meta.env?.VITE_LOG_LEVEL) {
    const v = import.meta.env.VITE_LOG_LEVEL.toLowerCase();
    return levels[v] !== undefined ? v : 'info';
  }
  return import.meta.env?.DEV ? 'debug' : 'warn';
}

const currentLevelName = getDefaultLevel();
const currentLevel = levels[currentLevelName];

function shouldLog(levelName) {
  const lv = levels[levelName];
  return lv >= currentLevel && currentLevel !== levels.silent;
}

export const logger = {
  debug: (...args) => {
    if (shouldLog('debug')) {
      console.debug(...args);
    }
  },
  info: (...args) => {
    if (shouldLog('info')) {
      console.info(...args);
    }
  },
  warn: (...args) => {
    if (shouldLog('warn')) {
      console.warn(...args);
    }
  },
  error: (...args) => {
    if (shouldLog('error')) {
      console.error(...args);
    }
  },
  level: currentLevelName,
};

export default logger;
