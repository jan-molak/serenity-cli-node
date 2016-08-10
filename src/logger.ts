import winston = require('winston');

export const logger: winston.LoggerInstance = new (winston.Logger)({
    transports: [],
});
