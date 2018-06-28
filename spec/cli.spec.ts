import 'mocha';

import cli = require('../src/cli');

describe('Serenity/JS CLI', () => {
    it('should execute without crashing', () => {

        cli();
    });
});
