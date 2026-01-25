const { ENV } = require('../config/env.config');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const getTimestamp = () => new Date().toISOString();

const formatMessage = (level, color, ...args) => {
  const timestamp = getTimestamp();
  const prefix = `${color}[${timestamp}] [${level}]${colors.reset}`;
  console.log(prefix, ...args);
};

const logger = {
  info: (...args) => formatMessage('INFO', colors.cyan, ...args),
  
  error: (...args) => formatMessage('ERROR', colors.red, ...args),
  
  warn: (...args) => formatMessage('WARN', colors.yellow, ...args),
  
  success: (...args) => formatMessage('SUCCESS', colors.green, ...args),
  
  debug: (...args) => {
    if (ENV.NODE_ENV === 'development') {
      formatMessage('DEBUG', colors.magenta, ...args);
    }
  },
};

module.exports = logger;
