// logger.js - Structured JSON logging utility

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

function formatMessage(level, message, meta = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  });
}

const logger = {
  error(message, meta = {}) {
    console.error(formatMessage(LOG_LEVELS.ERROR, message, meta));
  },

  warn(message, meta = {}) {
    console.warn(formatMessage(LOG_LEVELS.WARN, message, meta));
  },

  info(message, meta = {}) {
    console.log(formatMessage(LOG_LEVELS.INFO, message, meta));
  },

  debug(message, meta = {}) {
    if (process.env.LOG_LEVEL === 'DEBUG') {
      console.log(formatMessage(LOG_LEVELS.DEBUG, message, meta));
    }
  }
};

module.exports = logger;