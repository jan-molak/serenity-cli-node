import expect = require('../expect');
import mockfs = require('mock-fs');
import winston = require('winston');
import { Directory } from 'mock-fs';

import { handler as run } from '../../src/commands/run';
import { logger } from '../../src/logger';

describe('serenity run', () => {

    const No_Arguments = {},
          Empty_Directory: Directory = <any> {};

    let log: { errorOutput: string[], writeOutput: string[] };

    beforeEach(() => {
        delete process.env.JAVA_HOME;

        logger.add(winston.transports.Memory);
        log = logger.transports['memory'];             // tslint:disable-line:no-string-literal
    });

    afterEach(() => {
        logger.remove(winston.transports.Memory);

        mockfs.restore();
    });

    describe('complains when the JAVA_HOME', () => {

        it('points to a directory that does not exist', () => {

            process.env.JAVA_HOME = '/non/existent/path';

            return expect(run(No_Arguments)).to.be.eventually.rejectedWith('Error: $JAVA_HOME is not set')
                .then(() => {
                    expect(log.errorOutput.pop()).to.contain('Is JAVA_HOME configured correctly? Error: $JAVA_HOME is not set');
                });
        });

        it('points to a directory that does not contain a java executable', () => {

            mockfs({
                '/some/java/home': Empty_Directory,
            });

            process.env.JAVA_HOME = '/some/java/home';

            return expect(run(No_Arguments)).to.be.eventually.rejectedWith('Error: Couldn\'t access "/some/java/home/bin/java"')
                .then(() => {
                    expect(log.errorOutput.pop()).to.contain('Is JAVA_HOME configured correctly? Error: Couldn\'t access "/some/java/home/bin/java"');
                });
        });
    });
});
