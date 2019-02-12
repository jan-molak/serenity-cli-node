import 'mocha';

import expect = require('../expect');
import mockfs = require('mock-fs');
import path = require('path');
import winston = require('winston');
import { Directory } from 'mock-fs';
import fs = require('fs');
import os = require('os');

import { filenameOf } from '../../src/actions/files';
import { handler as run, javaFor } from '../../src/commands/run';
import { defaults } from '../../src/config';
import { logger } from '../../src/logger';

describe('serenity run', () => {

    const
        Default_Arguments = {
            artifact: defaults.artifact,
            cacheDir: defaults.cacheDir,
            destination: defaults.reportDir,
            features: defaults.featuresDir,
            source: defaults.sourceDir,
            log: 'info',
        },
        Verbose_Logging = Object.assign(
            {}, Default_Arguments, { log: 'verbose' },
        ),
        Debug_Logging = Object.assign(
            {}, Default_Arguments, { log: 'debug' },
        ),
        Empty_Directory: Directory = {} as any,
        Path: string = process.env.PATH;

    let log: winston.MemoryTransportInstance;

    beforeEach (() => {
        delete process.env.JAVA_HOME;

        logger.add(winston.transports.Memory);
        log = logger.transports['memory'] as winston.MemoryTransportInstance;   // tslint:disable-line:no-string-literal
    });

    afterEach (() => {
        logger.remove(winston.transports.Memory);

        mockfs.restore();
    });

    describe ('uses the correct java binary', () => {

        it('works on Windows', () => {
           expect(javaFor('Windows_NT')).to.equal('java.exe');
        });

        it('works on Mac OS', () => {
            expect(javaFor('Darwin')).to.equal('java');
        });

        it('works on Linux', () => {
            expect(javaFor('Linux')).to.equal('java');
        });
    });

    describe ('when JAVA_HOME', () => {

        it('is not set up, but the java binary can be found on the $PATH', () => {
            scenario('path_to_java_home_is_invalid');
            process.env.PATH = append(stripJava(Path), 'running_serenity');

            return expect(run(Default_Arguments)).to.be.eventually.fulfilled
                .then(() => {
                    const first = log.writeOutput[0];

                    expect(first).to.contain('Using Java at:');
                    expect(log.errorOutput).to.be.empty;        // tslint:disable-line:no-unused-expression
                });
        });

        it ('points to a directory that does not exist and java binary is not on the $PATH', () => {

            scenario('path_to_java_home_is_invalid');
            process.env.PATH = stripJava(Path);

            return expect(run(Default_Arguments)).to.be.eventually.rejected
                .then(() => expect(log.errorOutput.pop()).to.contain(
                    'Is Java set up correctly',
                ));
        });

        it ('points to a directory that does not contain a java executable and java binary is not on the $PATH', () => {

            mockfs({
                '/some/java/home': Empty_Directory,
            });

            process.env.JAVA_HOME = '/some/java/home';
            process.env.PATH = stripJava(Path);

            return expect(run(Default_Arguments)).to.be.eventually.rejectedWith(
                    'Is Java set up correctly? "java" could not be found at JAVA_HOME or on the PATH',
                )
                .then(() => expect(log.errorOutput.pop()).to.contain(
                    'Is Java set up correctly? "java" could not be found at JAVA_HOME or on the PATH',
                ));
        });
    });

    describe ('when calling the Serenity BDD CLI jar', () => {

        it('advises what to do if the jar has not been downloaded yet', () => {
            scenario('jar_not_found');

            return expect(run({ artifact: defaults.artifact, cacheDir: '.', log: 'info' })).to.be.eventually.rejected
                .then(() => expect(log.errorOutput.pop()).to.contain(
                    'Did you remember to run `serenity update`? Error: Unable to access jarfile'
                ));
        });

        it('advises if the Java version used is too old', () => {
            scenario('java6');

            return expect(run(Default_Arguments)).to.be.eventually.rejectedWith(
                    'Looks like you\'re using an old version of Java? Serenity BDD needs Java 8 or newer.'
                )
                .then(() => expect(log.errorOutput.pop()).to.contain(
                    'Looks like you\'re using an old version of Java? Serenity BDD needs Java 8 or newer.'
                ));
        });

        it('passes the valid arguments through', () => {
            scenario('noop');

            let pathToArtifact = path.resolve(defaults.cacheDir, filenameOf(defaults.artifact));

            return expect(run(Verbose_Logging)).to.be.eventually.fulfilled
                .then(() => {
                    expect(log.writeOutput).to.have.lengthOf(3);

                    expect(log.writeOutput[ 1 ]).to.contain(
                        `-jar ${ pathToArtifact } --destination ${ defaults.reportDir } ` +
                        `--features ${ defaults.featuresDir } --source ${ defaults.sourceDir }`
                    );
                });
        });

    });

    describe('when processing the Serenity BDD CLI output', () => {

        const NTCR    = 'net.thucydides.core.requirements',
              Warning = 'To generate correct requirements coverage reports you need ' +
                  'to set the \'serenity.test.root\' property to the package representing ' +
                  'the top of your requirements hierarchy.',
              Expected_Output = [
                  'verbose: -------------------------------',
                  'verbose: SERENITY COMMAND LINE INTERFACE',
                  'verbose: -------------------------------',
                  'verbose: Loading test outcomes from target/site/serenity',
                  'verbose: Writing aggregated report to target/site/serenity',
                  `warn: ${ NTCR }.PackageRequirementsTagProvider - ${ Warning }`,
                  `warn: ${ NTCR }.PackageRequirementsTagProvider - ${ Warning }`,
                  'verbose: net.serenitybdd.plugins.jira.JiraFileServiceUpdater - Update Jira for test results from /Users/jan/example/target/site/serenity',
                  'verbose: Report generation done',
                  'info: All done!',
              ];

        it ('show only the relevant information', () => {
            scenario('running_serenity');

            return expect(run(Default_Arguments)).to.be.eventually.fulfilled
                .then(() => {
                    let [first, ...rest] = log.writeOutput;

                    expect(first).to.contain('Using Java at:');
                    expect(rest).to.deep.equal([
                        `warn: ${ NTCR }.PackageRequirementsTagProvider - ${ Warning }`,
                        `warn: ${ NTCR }.PackageRequirementsTagProvider - ${ Warning }`,
                        'info: All done!',
                    ]);

                    expect(log.errorOutput).to.be.empty;
                });
        });

        it ('show more details if needed', () => {
            scenario('running_serenity');

            return expect(run(Verbose_Logging)).to.be.eventually.fulfilled
                .then(() => {
                    let [first, ...rest] = log.writeOutput;

                    expect(first).to.contain('Using Java at:');
                    expect(rest).to.deep.equal(Expected_Output);

                    expect(log.errorOutput).to.be.empty;
                });
        });

        it ('shows all the details if needed', () => {
            scenario('running_serenity');

            return expect(run(Debug_Logging)).to.be.eventually.fulfilled
                .then(() => {
                    let [, ...rest] = log.writeOutput;

                    expect(rest).to.deep.equal(Expected_Output);

                    expect(log.errorOutput).to.deep.equal([
                        'debug: net.serenitybdd.cli.reporters.CLIOutcomeReportGenerator - Shutting down Test outcome reports generation',
                        'debug: net.serenitybdd.cli.reporters.CLIOutcomeReportGenerator - HTML test reports generated in 33 ms',
                        'debug: net.thucydides.core.reports.html.HtmlAggregateStoryReporter - Shutting down Test outcome reports generation',
                        'debug: net.thucydides.core.requirements.reports.FileSystemRequirmentsOutcomeFactory - Loaded requirements from file system = []',
                        `debug: ${ NTCR }.RequirementsTagProvider - Requirements found:[]`,
                        `debug: ${ NTCR }.RequirementsTagProvider - Requirements found:[]`,
                        `debug: ${ NTCR }.RequirementsTagProvider - Reading requirements from ${ NTCR }.PackageRequirementsTagProvider@597228b7`,
                        `debug: ${ NTCR }.RequirementsTagProvider - Reading requirements from ${ NTCR }.PackageRequirementsTagProvider@597228b7`,
                        `debug: ${ NTCR }.RequirementsTagProvider - Reading requirements from ${ NTCR }.FileSystemRequirementsTagProvider@ed2f160`,
                        `debug: ${ NTCR }.RequirementsTagProvider - Reading requirements from ${ NTCR }.FileSystemRequirementsTagProvider@ed2f160`,
                        `debug: ${ NTCR }.RequirementsTagProvider - Requirements found:[]`,
                        `debug: ${ NTCR }.RequirementsTagProvider - Requirements found:[]`,
                        `debug: ${ NTCR }.RequirementsTagProvider - Requirements found:[]`,
                        `debug: ${ NTCR }.RequirementsTagProvider - Loaded Releases: []`,
                        'debug: net.thucydides.core.reports.html.ReportingTask - Aggregate reports generated in 327 ms',
                        'debug: net.thucydides.core.reports.html.HtmlAggregateStoryReporter - Test outcome reports generated in 327 ms',
                        'debug: net.serenitybdd.plugins.jira.JiraUpdater - JIRA LISTENER STATUS',
                        'debug: net.serenitybdd.plugins.jira.JiraUpdater - JIRA URL: null',
                        'debug: net.serenitybdd.plugins.jira.JiraUpdater - REPORT URL:',
                        'debug: net.serenitybdd.plugins.jira.JiraUpdater - WORKFLOW ACTIVE: false',
                    ]);
                });
        });
    });

    function scenario(name: string) {
        process.env.JAVA_HOME = path.resolve(process.cwd(), 'resources/java_scenarios/', name);
        process.env.PATH      = Path;
    }

    function append(systemPath: string, scenarioName: string) {
        return [path.resolve(process.cwd(), 'resources/java_scenarios/', scenarioName, 'bin'), systemPath].join(path.delimiter);
    }

    function stripJava(systemPath: string) {
        const java = javaFor(os.type());

        return systemPath.split(path.delimiter)
            .filter(p => ! fs.existsSync(path.join(p, java)))
            .join(path.delimiter);
    }
});
