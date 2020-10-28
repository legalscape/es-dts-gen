import * as winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp(),
    winston.format.cli(),
    winston.format.printf((info) =>
      info.stack
        ? `${info.timestamp}  ${info.level} ${info.message} ${info.stack}`
        : `${info.timestamp}  ${info.level} ${info.message}`
    )
  ),
  transports: [new winston.transports.Console()],
});

export { logger };
