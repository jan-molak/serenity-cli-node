import 'mocha';

import mockfs = require('mock-fs');
import winston = require('winston');
import expect = require('../expect');
import * as fs from 'fs';

import { Directory } from 'mock-fs';
import { builder as args, handler as remove } from '../../src/commands/remove';

import { logger } from '../../src/logger';

describe('serenity remove', () => {

    const Default_Args = {cacheDir: args.cacheDir.default, log: 'info'},
        Empty_Directory: Directory = {} as Directory;          // tslint:disable-line:no-object-literal-type-assertion

    let log: winston.MemoryTransportInstance;

    beforeEach(() => {
        delete process.env.JAVA_HOME;

        logger.add(winston.transports.Memory);
        log = logger.transports['memory'] as winston.MemoryTransportInstance;   // tslint:disable-line:no-string-literal
    });

    afterEach(() => {
        logger.remove(winston.transports.Memory);
        mockfs.restore();
    });

    describe('considers the removal of the cache directory successful when it', () => {

        it('existed and got correctly removed', () => {
            mockfs({
                '.cache': {
                    'serenity-cli-1.0.0-all.jar': '',
                },
            });

            return expect(remove(Default_Args))
                .to.be.eventually.fulfilled
                .then(() => {
                    expect(fs.existsSync('.cache')).to.be.false;             // tslint:disable-line:no-unused-expression
                });
        });

        it('never existed', () => {
            mockfs({
                '/tmp': Empty_Directory,
            });

            const customCacheDir = '/tmp/some/custom/cache';

            return expect(remove({cacheDir: customCacheDir, log: 'info'}))
                .to.be.eventually.fulfilled
                .then(() => {
                    expect(log.writeOutput.pop()).to.contain('Removed cache directory');

                    expect(fs.existsSync(customCacheDir)).to.be.false;       // tslint:disable-line:no-unused-expression
                });
        });
    });

    describe('notifies when the removal', () => {
        it('was successful (default cache dir)', () => {
            mockfs({
                '.cache': {
                    'serenity-cli-1.0.0-all.jar': '',
                },
            });

            return expect(remove(Default_Args))
                .to.be.eventually.fulfilled
                .then(() => {
                    expect(log.writeOutput.pop()).to.contain('Removed cache directory');
                });
        });

        it('was successful (custom cache dir)', () => {
            mockfs({
                '/tmp/serenity': {
                    'serenity-cli-1.0.0-all.jar': '',
                },
            });

            return expect(remove({cacheDir: '/tmp/serenity', log: 'info'}))
                .to.be.eventually.fulfilled
                .then(() => {
                    expect(log.writeOutput.pop()).to.contain('Removed cache directory at /tmp/serenity');
                });
        });

        it('failed because of the insufficient of permissions', () => {
            mockfs({
                '/some-system-dir': systemDirectoryWith({'sytem-file.sys': ''}),
            });

            return expect(remove({cacheDir: '/some-system-dir', log: 'info'}))
                .to.be.eventually.rejectedWith('EACCES, permission denied \'/some-system-dir/sytem-file.sys\'')
                .then(() => {
                    expect(log.errorOutput.pop())
                        .to.contain('Couldn\'t remove the cache directory. EACCES, permission denied \'/some-system-dir/sytem-file.sys\'');
                });
        });
    });

    function systemDirectoryWith(files: any): Directory {
        return mockfs.directory({mode: 0o000, items: files});
    }
});
