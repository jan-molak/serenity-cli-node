import expect = require('../expect');
import mockfs = require('mock-fs');
import path = require('path');
import winston = require('winston');
import { Directory } from 'mock-fs';

import { filenameOf } from '../../src/actions/files';
import { handler as run } from '../../src/commands/run';
import { defaults } from '../../src/config';
import { logger } from '../../src/logger';

describe('serenity run', () => {

    const Default_Arguments          = {
              cacheDir:    defaults.cacheDir,
              destination: defaults.reportDir,
              features:    defaults.featuresDir,
              source:      defaults.sourceDir,
          },
          Empty_Directory: Directory = <any> {};

    let log: { errorOutput: string[], writeOutput: string[] };

    beforeEach (() => {
        delete process.env.JAVA_HOME;

        logger.add(winston.transports.Memory);
        log = logger.transports['memory'];             // tslint:disable-line:no-string-literal
    });

    afterEach (() => {
        logger.remove(winston.transports.Memory);

        mockfs.restore();
    });

    describe ('advises what to do when the JAVA_HOME', () => {

        it ('points to a directory that does not exist', () => {

            process.env.JAVA_HOME = '/non/existent/path';

            return expect(run(Default_Arguments)).to.be.eventually.rejectedWith(
                    'Error: Did you set JAVA_HOME correctly? $JAVA_HOME is not set'
                )
                .then(() => expect(log.errorOutput.pop()).to.contain(
                    'Did you set JAVA_HOME correctly? $JAVA_HOME is not set'
                ));
        });

        it ('points to a directory that does not contain a java executable', () => {

            mockfs({
                '/some/java/home': Empty_Directory,
            });

            process.env.JAVA_HOME = '/some/java/home';

            return expect(run(Default_Arguments)).to.be.eventually.rejectedWith(
                    'Error: Did you set JAVA_HOME correctly? Couldn\'t access "/some/java/home/bin/java"'
                )
                .then(() => expect(log.errorOutput.pop()).to.contain(
                    'Did you set JAVA_HOME correctly? Couldn\'t access "/some/java/home/bin/java"'
                ));
        });
    });

    describe ('when calling the Serenity BDD CLI jar', () => {

        it ('advises what to do if the jar has not been downloaded yet', () => {
            process.env.JAVA_HOME = path.resolve(process.cwd(), 'resources/java_home/jar_not_found');

            return expect(run({ cacheDir: '.' })).to.be.eventually.rejected
                .then(() => expect(log.errorOutput.pop()).to.contain(
                    'Did you remember to run `serenity update`? Error: Unable to access jarfile'
                ));
        });

        it ('passes the valid arguments through', () => {
            process.env.JAVA_HOME = path.resolve(process.cwd(), 'resources/java_home/noop');

            let pathToArtifact = path.resolve(defaults.cacheDir, filenameOf(defaults.artifact));

            return expect(run(Default_Arguments)).to.be.eventually.fulfilled
                .then(() => expect(log.writeOutput[1]).to.contain(
                    `-jar ${ pathToArtifact } --destination ${ defaults.reportDir } ` +
                    `--features ${ defaults.featuresDir } --source ${ defaults.sourceDir }`
                ));
        });
    });
});
