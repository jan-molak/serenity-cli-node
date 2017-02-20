import { logger } from '../logger';
import { format } from 'util';

export const notify = <T>(template: string, level: string) => (arg: T) => {

    switch (true) {
        case arg instanceof Error:
            logger.log(level, template, [ (<any> arg).message ]);

            return Promise.reject<T>(new Error(format(template, (<any> arg).message)));

        case typeof arg === 'boolean':
            logger.log(level, template);

            break;

        default:
            logger.log(level, template, [ arg ]);
    }

    return Promise.resolve<T>(arg);
};

export const advise = (template: string) => (error: Error) => {

    switch (true) {
        case /ETIMEDOUT/.test(error.message):
            return complain(format(template, 'Are you behind a proxy or a firewall that needs to be configured?'))(error);
        case /self signed ceritificate in certificate chain/.test(error.message):
            return complain(format(template, 'If you\'re using a self-signed certificate you might want to configure it correctly, ' +
                'or use the --ignoreSSL option.'))(error);
        default:
            return complain(template)(error);
    }
};

export const inform   = <T>(template: string) => notify<T>(template, 'info');
export const complain =    (template: string) => notify<Error>(template, 'error');
