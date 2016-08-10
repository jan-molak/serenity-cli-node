import { logger } from '../logger';

export const notify = <T>(template: string, level: string = 'info') => (arg: T) => {
    if (typeof arg === 'boolean' && level !== 'debug') {
        logger.log(level, template);
    } else {
        logger.log(level, template, [ arg ]);
    }

    if (arg instanceof Error) {
        return Promise.reject<T>(arg);
    }

    return Promise.resolve<T>(arg);
};

export const debug    = <T>(template: string) => notify<T>(template, 'debug');
export const inform   = <T>(template: string) => notify<T>(template, 'info');
export const warn     = <T>(template: string) => notify<T>(template, 'warn');
export const complain = (template: string) => notify<Error>(template, 'error');
