import { createLogger, format, transports } from 'winston';
const { combine, timestamp, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
    return `[${level}] ${timestamp}: ${message}`;
});

const logger = createLogger({
    format: combine(
        format.colorize(),
        timestamp(),
        myFormat
    ),
    transports: [new transports.Console()]
});
export default logger;
