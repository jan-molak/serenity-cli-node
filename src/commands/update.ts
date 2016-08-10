import { default as download } from 'mvn-artifact-download';
import { default as filenameOf } from 'mvn-artifact-filename';
import { default as parseArtifact } from 'mvn-artifact-name-parser';
import * as path from 'path';

import { checkIfFileMissing, ensureDirectoryIsPresent } from '../actions/files';
import { conditionally } from '../actions/flow_control';
import { complain, debug, inform } from '../actions/logging';
import { defaults } from '../config';

export const command = 'update';

export const desc = 'Makes sure the Serenity BDD CLI jar file is available and up to date';

export const builder = {
    cacheDir: {
        default:   defaults.cacheDir,
        describe: 'An absolute or relative path to where the Serenity BDD CLI jar file should be stored',
    },
};

export const handler = (argv: any) =>
    ensureDirectoryIsPresent(path.resolve(process.cwd(), argv.cacheDir))
        .then(debug('Using cache dir at %s'))
        .then(downloadArtifactIfNeeded(defaults.artifact, defaults.repository))
        .catch(complain('A problem occurred: %s'));

// --

const downloadArtifactIfNeeded = (artifactGAV: string, repository: string) => (cacheDir: string) => {

    let filename = filenameOf(parseArtifact(artifactGAV)),
        pathToCached = path.resolve(cacheDir, filename);

    return checkIfFileMissing(pathToCached)
        .then(conditionally(
            inform('Looks like the Serenity BDD CLI jar file needs updating. Let me download it for you...'),
            inform('Serenity BDD CLI jar file is up to date :-)')
        ))
        .then(conditionally(() => download(artifactGAV, cacheDir, repository)))
        .then(conditionally(inform('Downloaded to %s')));
};
