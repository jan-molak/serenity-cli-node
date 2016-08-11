import fs = require('fs');
import constants = require('constants');
import { format } from 'util';

import childProcess = require('child_process');
import { Stats } from 'fs';
import mkdirp = require('mkdirp');
import rimraf = require('rimraf');

import { default as filename } from 'mvn-artifact-filename';
import { default as parse } from 'mvn-artifact-name-parser';

import { logger } from '../logger';

export const ensureDirectoryIsPresent = (destination: string) => new Promise<string>((resolve, reject) => {

    mkdirp(destination, (error?: Error) => {
        if (!! error) {
            reject(error);
        } else {
            resolve(destination);
        }
    });
});

export const ensureFileIsPresent = (destination: string) => new Promise<string>((resolve, reject) => {

    fs.access(destination, constants.F_OK | constants.X_OK, (error?: Error) => {
        if (!! error) {
            reject(new Error(format('Couldn\'t access "%s"', destination)));
        } else {
            resolve(destination);
        }
    });
});

export const removeDirectory = (destination: string) => new Promise<string>((resolve, reject) => {

    rimraf(destination, (error: Error) => {
        if (!! error) {
            reject(error);
        } else {
            resolve(destination);
        }
    });
});

export const checkIfFileMissing = (pathToFile: string) => new Promise<boolean>((resolve, reject) => {
    fs.stat(pathToFile, (error: NodeJS.ErrnoException, stats: Stats) => {
        if (!! error) {
            if (error.code === 'ENOENT') {
                resolve(true);
            }
            else {
                reject(error);
            }
        }

        resolve(stats && ! stats.isFile());
    });
});

export const executeWith = (args: string[]) => (pathToBinary: string) => new Promise<boolean>((resolve, reject) => {

    function withAdviseOn(issue: string): string {
        return issue.indexOf('jarfile') > 0
            ? 'Did you remember to run `serenity update`? ' + issue
            : issue;
    }

    function asString(buffer: Buffer) {
        return buffer.toString().trim();
    }

    let spawned = childProcess.spawn(pathToBinary, args);

    spawned.stdout.on('data', (data: Buffer) => {
        logger.info(asString(data));
    });

    spawned.stderr.on('data', (problem: Buffer) => {
        reject(new Error(withAdviseOn(asString(problem))));
    });

    spawned.on('close', (exitCode) => {
        if (exitCode !== 0) {
            reject(new Error(`${pathToBinary} process exited with code ${exitCode}`));
        } else {
            resolve(true);
        }
    });
});

export const filenameOf = (artifact: string) => filename(parse(artifact));
