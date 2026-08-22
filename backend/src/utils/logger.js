import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logDir = path.join(__dirname, '../../logs');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) =>
      `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

const transports = [
  // Console transport
  new winston.transports.Console(),
  
  // Error file transport
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: winston.format.uncolorize(),
  }),
  
  // All logs file transport
  new winston.transports.File({
    filename: path.join(logDir, 'all.log'),
    format: winston.format.uncolorize(),
  }),
];

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels,
  format,
  transports,
});
