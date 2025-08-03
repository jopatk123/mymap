class Logger {
  static info(message, data = {}) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[INFO] ${new Date().toISOString()} - ${message}`, data)
    }
  }
  
  static warn(message, data = {}) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data)
  }
  
  static error(message, error = {}) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error)
  }
  
  static debug(message, data = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data)
    }
  }
}

module.exports = Logger