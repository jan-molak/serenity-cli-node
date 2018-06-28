import winston = require('winston');
import yargs = require('yargs');

import { logger } from './logger';

process.on('unhandledRejection', function(err) {
    console.error('An error occurred.', err);                                          // tslint:disable-line:no-console
});

export = function bootstrap() {

    if (process.env.NODE_ENV !== 'test') {
        logger.add(winston.transports.Console, { colorize: true });
    }

    // tslint:disable-next-line:no-unused-expression
    yargs
        .version(require('../package.json').version)
        .demand(1)
        .option('log', {
            describe: 'log level',
            choices: ['info', 'verbose', 'debug'],
            default: 'info',
        })
        .usage('Usage: $0 <command> [options]')
        .example('$0 update [options]', 'updates the Serenity jar to the latest version')
        .example('$0 remove [options]', 'removes the cache directory and downloaded jars')
        .example('$0 run [options]',    'generates the HTML report')
        .example('$0 <command> --help', 'shows the available parameters')
        .epilog('copyright (C) Jan Molak <jan.molak@smartcodeltd.co.uk>')
        .commandDir('commands')
        .alias('h', 'help').help()
        .argv;
};
