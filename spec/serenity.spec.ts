// import child_process = require('child_process');
// // import path = require('path');
//
// import expect = require('./expect');
//
// function spawn(program: string, args: string[] = []): string[] {
//     let spawned = child_process.spawnSync(program, args, { stdio: 'pipe', cwd: '.' }),
//         stderr  = spawned.output[2].toString();
//
//     if (stderr) {
//         throw new Error(`Executing '${ program } ${ args.join(' ') }' finished with: \n ${ stderr }`);
//     }
//
//     return spawned.output[1].toString().split('\n');
// }
//
// describe('Serenity Command Line Interface', () => {
//
//     it('should offer help', () => {
//
//         let out = spawn('node', ['bin/serenity', 'help']);
//
//         expect(out).to.deep.equal([]);
//     });
// });
