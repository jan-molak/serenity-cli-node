import expect = require('../expect');
import mockfs = require('mock-fs');
import path = require('path');
import winston = require('winston');
import { Directory } from 'mock-fs';

import { filenameOf } from '../../src/actions/files';
import { handler as run, javaFor } from '../../src/commands/run';
import { defaults } from '../../src/config';
import { logger } from '../../src/logger';

describe('serenity run', () => {

    const Default_Arguments          = {
              cacheDir:    defaults.cacheDir,
              destination: defaults.reportDir,
              features:    defaults.featuresDir,
              source:      defaults.sourceDir,
          },
          Verbose_Logging            = Object.assign(
              {}, Default_Arguments, { verbose: true }
          ),
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

    describe ('advises what to do when the java executable', () => {

        it ('is not found in the current path', () => {

            mockfs({
                '/some/java/home': Empty_Directory,
            });

            return expect(run(Default_Arguments)).to.be.eventually.rejectedWith(
                    'Error: Is Java installed in the current path? not found: java'
                )
                .then(() => expect(log.errorOutput.pop()).to.contain(
                    'Is Java installed in the current path? not found: java'
                ));
        });
    });

    describe ('when calling the Serenity BDD CLI jar', () => {

        it('advises what to do if the jar has not been downloaded yet', () => {
            scenario('jar_not_found');

            return expect(run({ cacheDir: '.' })).to.be.eventually.rejected
                .then(() => expect(log.errorOutput.pop()).to.contain(
                    'Did you remember to run `serenity update`? Error: Unable to access jarfile'
                ));
        });

        it('advises if the Java version used is too old', () => {
            scenario('java6');

            return expect(run(Default_Arguments)).to.be.eventually.rejectedWith(
                    'Looks like you\'re using an old version of Java? Serenity BDD needs Java 7 or newer.'
                )
                .then(() => expect(log.errorOutput.pop()).to.contain(
                    'Looks like you\'re using an old version of Java? Serenity BDD needs Java 7 or newer.'
                ));
        });

        it('passes the valid arguments through', () => {
            scenario('noop');

            let pathToArtifact = path.resolve(defaults.cacheDir, filenameOf(defaults.artifact));

            return expect(run(Default_Arguments)).to.be.eventually.fulfilled
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
                  'info: -------------------------------',
                  'info: SERENITY COMMAND LINE INTERFACE',
                  'info: -------------------------------',
                  'info: Loading test outcomes from target/site/serenity',
                  'info: Writing aggregated report to target/site/serenity',
                  `warn: ${ NTCR }.PackageRequirementsTagProvider - ${ Warning }`,
                  `warn: ${ NTCR }.PackageRequirementsTagProvider - ${ Warning }`,
                  'info: net.serenitybdd.plugins.jira.JiraFileServiceUpdater - Update Jira for test results from /Users/jan/example/target/site/serenity',
                  'info: Report generation done',
                  'info: All done!',
              ];

        it ('show only the relevant information', () => {
            scenario('running_serenity');

            return expect(run(Default_Arguments)).to.be.eventually.fulfilled
                .then(() => {
                    let [first, ...rest] = log.writeOutput;

                    expect(first).to.contain('Using Java at:');
                    expect(rest).to.deep.equal(Expected_Output);

                    expect(log.errorOutput).to.be.empty;
                });
        });

        it ('shows all the details if needed', () => {
            scenario('running_serenity');

            return expect(run(Verbose_Logging)).to.be.eventually.fulfilled
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

    function scenario(scenario: string) {
        process.env.PATH = path.resolve(process.cwd(), 'resources/java_scenarios/', scenario, 'bin') + ':' + process.env.PATH;
    }
});
