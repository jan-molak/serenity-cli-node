import expect = require('../expect');
import mockfs = require('mock-fs');
import { handler as update } from '../../src/commands/update';
import { defaults } from '../../src/config';
import { logger } from '../../src/logger';
import { default as filenameOf } from 'mvn-artifact-filename';
import { default as parseArtifact } from 'mvn-artifact-name-parser';
import winston = require('winston');

import nock = require('nock');
import { Directory } from 'mock-fs';

describe('serenity update', () => {

    const Artifact_File = filenameOf(parseArtifact(defaults.artifact)),
          File_Contents = 'some binary stuff';

    let log: { errorOutput: string[], writeOutput: string[] };

    beforeEach(() => {
        logger.add(winston.transports.Memory);
        log = logger.transports['memory'];             // tslint:disable-line:no-string-literal
    });

    afterEach(() => {
        logger.remove(winston.transports.Memory);

        mockfs.restore();
    });

    it ('does nothing if the Serenity BDD CLI jar is already downloaded', () => {

        mockfs({
            '.cache': directoryWith(Artifact_File),
        });

        return expect(update({ cacheDir: '.cache', repository: defaults.repository })).to.be.eventually.fulfilled
            .then(() => {
                expect(log.writeOutput.pop()).to.contain('Serenity BDD CLI jar file is up to date');
            });
    });

    it ('downloads the Serenity BDD CLI if it is needed', () => {

        let scope = nock(defaults.repository)
            .get(new RegExp(Artifact_File))
            .reply(200);

        mockfs({});

        return expect(update({ cacheDir: '.' , repository: defaults.repository})).to.be.eventually.fulfilled
            .then(() => {
                expect(scope.isDone()).to.be.true;

                expect(Artifact_File).to.be.a.file;
            });
    });

    it ('advises what to do if the CDN could not be reached within the timeout', () => {

        nock(defaults.repository)
            .get(new RegExp(Artifact_File))
            .replyWithError('ETIMEDOUT');

        mockfs({});

        return expect(update({ cacheDir: '.', repository: defaults.repository})).to.be.rejectedWith('ETIMEDOUT')
            .then(() => expect(log.errorOutput.pop()).to.contain(
                'Looks like an error occurred downloading the Serenity BDD CLI jar. Are you behind a proxy or a firewall that needs to be configured? ETIMEDOUT'
            ));
    });

    describe ('complains when the cache directory', () => {

        it ('cannot be accessed', () => {

            mockfs({
                '/inaccessible-dir': inaccessibleDirectoryWith({ 'some-file.sys': '' }),
            });

            return expect(update({ cacheDir: '/inaccessible-dir', repository: defaults.repository }))
                .to.be.eventually.rejected
                .then(() => expect(log.errorOutput.pop()).to.contain(
                    'Couldn\'t access the cache directory. EACCES, permission denied'
                ));
        });

        it ('cannot be created', () => {

            mockfs({
                '/inaccessible-dir': inaccessibleDirectoryWith({ 'some-file.sys': '' }),
            });

            return expect(update({ cacheDir: '/inaccessible-dir/cache', repository: defaults.repository }))
                .to.be.eventually.rejectedWith('EACCES, permission denied \'/inaccessible-dir/cache\'')
                .then(() => {
                    expect(log.errorOutput.pop()).to.contain('Couldn\'t create a cache directory. EACCES, permission denied');
                });
        });
    });

    function directoryWith(filename: string): Directory {
        let dir = <Directory> {};

        dir[filename] = File_Contents;

        return dir;
    }

    function inaccessibleDirectoryWith(files: any ): Directory {
        return mockfs.directory({ mode: 0o000, items: files });
    }
});
