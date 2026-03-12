import pino from 'pino';

/** Create a structured logger instance */
export function createLogger(name: string) {
  return pino({
    name,
    level: process.env['LOG_LEVEL'] ?? 'info',
    transport:
      process.env['NODE_ENV'] === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  });
}
