import { complain, inform } from '../actions/logging';
import { defaults } from '../config';

import os = require('os');
import path = require('path');

import { ensureFileIsPresent, filenameOf } from '../actions/files';
import { executeWith } from '../actions/process';
import { adjustLogging } from '../logger';
const javaHome = require('java-home'); // tslint:disable-line:no-var-requires
const which    = require('which');     // tslint:disable-line:no-var-requires

export const command = 'run';

export const desc = 'Aggregates the JSON reports generated by Serenity BDD and produces one in HTML';

export const builder = {
    cacheDir:        {
        default:  defaults.cacheDir,
        describe: 'An absolute or relative path to where the Serenity BDD CLI jar file should be stored',
    },
    destination:     {
        default:  defaults.reportDir,
        describe: 'Directory to contain the generated Serenity BDD report',
    },
    features:        {
        default:  defaults.featuresDir,
        describe: 'Source directory containing the Cucumber.js feature files',
    },
    source:          {
        default:  defaults.sourceDir,
        describe: 'Source directory containing the Serenity BDD JSON output files',
    },
    issueTrackerUrl: {
        describe: 'Base URL for issue trackers other than JIRA',
    },
    jiraProject:     {
        describe: 'JIRA project identifier',
    },
    jiraUrl:         {
        describe: 'Base URL of your JIRA server',
    },
    project:         {
        describe: 'Project name to appear in the Serenity reports (defaults to the project directory name)',
    },
};

export const handler = (argv: any) =>
    adjustLogging(argv.log)
        .then(findJava)
        .then(inform('Using Java at: %s'))
        .catch(complain('Is Java set up correctly? %s'))
        .then(executeWith(flatten([ '-jar', cliJarIn(argv.cacheDir), argumentsFrom(argv) ])))
        .catch(complain('%s'))
        .then(inform('All done!'));

// --

export const javaFor = (osName: string) => (osName === 'Windows_NT') ? 'java.exe' : 'java';

const findJava = () => javaHome.getPath()
    .then(javaDir => ensureFileIsPresent(path.resolve(javaDir, 'bin', javaFor(os.type()))))
    .catch(error => which.sync('java'))
    .catch(error => {
        throw new Error(`"${ javaFor(os.type()) }" could not be found at JAVA_HOME or on the PATH`);
    });

const cliJarIn = (cacheDir: string) => path.resolve(cacheDir, filenameOf(defaults.artifact));

const argumentsFrom = (argv: string) => {
    const validArguments = [
              'destination',
              'features',
              'issueTrackerUrl',
              'jiraProject',
              'jiraUrl',
              'project',
              'source',
          ],
          onlyThoseThatArePresent  = arg => !! argv[ arg ],
          toCLIParams = arg => [ `--${ arg }`, argv[ arg ] ];

    return validArguments.filter(onlyThoseThatArePresent).map(toCLIParams);
};

const flatten = (list: any[]) => list.reduce(
    (acc, current) => {
        Array.isArray(current)
            ? acc.push(...flatten(current))
            : acc.push(current);
        return acc;
    }, []);
