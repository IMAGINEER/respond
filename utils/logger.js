// logger.js - Logging utility

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL || 'INFO';
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta
    });
  }

  error(message, meta = {}) {
    console.error(this.formatMessage(LOG_LEVELS.ERROR, message, meta));
  }

  warn(message, meta = {}) {
    console.warn(this.formatMessage(LOG_LEVELS.WARN, message, meta));
  }

  info(message, meta = {}) {
    console.log(this.formatMessage(LOG_LEVELS.INFO, message, meta));
  }

  debug(message, meta = {}) {
    if (this.level === 'DEBUG') {
      console.log(this.formatMessage(LOG_LEVELS.DEBUG, message, meta));
    }
  }
}

module.exports = new Logger();