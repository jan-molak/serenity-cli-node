import * as fs from 'fs';
import * as path from 'path';
import * as ProgressBar from 'progress';
import * as request from 'request';

import filename from 'mvn-artifact-filename';
import parseName from 'mvn-artifact-name-parser';
import artifactUrl from 'mvn-artifact-url';

import http = require('http');

export function download(artifactName: string, destination: string = process.cwd(), ignoreSSL: boolean = false, showProgressBar: boolean = true, repository?: string) {
    return new Promise(function(resolve, reject) {
        const artifact = parseName(artifactName);
        const destFile = path.join(destination || process.cwd(), filename(artifact));

        artifactUrl(artifact, repository).then(url => {

            const sent = request.get({
                url,
                strictSSL: ! ignoreSSL,
            });

            sent.on('response', (r: http.IncomingMessage) => {
                if (r.statusCode === 200) {

                    if (showProgressBar) {
                        const total = parseInt(r.headers['content-length'], 10);

                        const bar = new ProgressBar('downloading [:bar] :rate/bps :percent :etas', {
                            complete: '=',
                            incomplete: ' ',
                            width: 20,
                            total,
                        });

                        r.on('data', chunk => bar.tick(chunk.length));
                    }

                    const file = fs.createWriteStream(destFile);
                    file.on('finish', () => {
                        file.close();
                        resolve(destFile);
                    });
                    file.on('error', (err: any) => {
                        fs.unlink(destFile, unlinkErr => reject(unlinkErr));
                        reject(err);
                    });
                    r.pipe(file);
                } else {
                    reject(r.statusCode);
                }
            });

            sent.on('error', (e: Error) => {
                reject(e);
            });
        });
    });
}
