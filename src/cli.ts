import yargs = require('yargs');
import winston = require('winston');

import { defaults } from './config';
import { logger } from './logger';

winston.level = defaults.logLevel;      // todo: override with -v -vv -vvv or something like that

logger.add(winston.transports.Console, {
    colorize: true,
});

yargs
    .alias('h', 'help').help('help')
    .version(() => require('../package.json').version)
    .demand(1)
    .usage('Usage: $0 <command> [options]')
    .epilog('copyright (C) Jan Molak <jan.molak@smartcodeltd.co.uk>')
    .commandDir('commands')
    .help()
    .argv;
