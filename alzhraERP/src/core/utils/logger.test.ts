import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
    let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
    let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let consoleTimeSpy: ReturnType<typeof vi.spyOn>;
    let consoleTimeEndSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => { });
        consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        consoleTimeSpy = vi.spyOn(console, 'time').mockImplementation(() => { });
        consoleTimeEndSpy = vi.spyOn(console, 'timeEnd').mockImplementation(() => { });

        // Reset logger config to default
        logger.configure({
            enabled: true,
            minLevel: 'debug',
            includeTimestamp: true,
            apmEnabled: false,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('debug', () => {
        it('should log debug messages with context', () => {
            logger.debug('TestContext', 'Debug message', { key: 'value' });

            expect(consoleDebugSpy).toHaveBeenCalledOnce();
            expect(consoleDebugSpy).toHaveBeenCalledWith(
                expect.stringContaining('[DEBUG]'),
                'Debug message',
                expect.objectContaining({ key: 'value' })
            );
        });

        it('should not log debug when disabled', () => {
            logger.configure({ enabled: false });
            logger.debug('TestContext', 'Debug message');

            expect(consoleDebugSpy).not.toHaveBeenCalled();
        });

        it('should not log debug when minLevel is higher', () => {
            logger.configure({ minLevel: 'info' });
            logger.debug('TestContext', 'Debug message');

            expect(consoleDebugSpy).not.toHaveBeenCalled();
        });

        it('should log debug without data', () => {
            logger.debug('TestContext', 'Debug message only');

            expect(consoleDebugSpy).toHaveBeenCalledWith(
                expect.stringContaining('[DEBUG]'),
                'Debug message only',
                expect.any(Object)
            );
        });
    });

    describe('info', () => {
        it('should log info messages with context', () => {
            logger.info('Auth', 'User logged in', { userId: '123' });

            expect(consoleInfoSpy).toHaveBeenCalledOnce();
            expect(consoleInfoSpy).toHaveBeenCalledWith(
                expect.stringContaining('[INFO]'),
                'User logged in',
                expect.objectContaining({ userId: '123' })
            );
        });

        it('should not log info when minLevel is warn', () => {
            logger.configure({ minLevel: 'warn' });
            logger.info('TestContext', 'Info message');

            expect(consoleInfoSpy).not.toHaveBeenCalled();
        });
    });

    describe('warn', () => {
        it('should log warning messages with context', () => {
            logger.warn('API', 'Rate limit approaching');

            expect(consoleWarnSpy).toHaveBeenCalledOnce();
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('[WARN]'),
                'Rate limit approaching',
                expect.any(Object)
            );
        });

        it('should not log warn when minLevel is error', () => {
            logger.configure({ minLevel: 'error' });
            logger.warn('TestContext', 'Warning message');

            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });
    });

    describe('error', () => {
        it('should log error messages with context and error object', () => {
            const testError = new Error('Test error');
            logger.error('Database', 'Connection failed', testError);

            expect(consoleErrorSpy).toHaveBeenCalledOnce();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('[ERROR]'),
                'Connection failed',
                expect.objectContaining({
                    error: expect.objectContaining({
                        name: 'Error',
                        message: 'Test error',
                    })
                })
            );
        });

        it('should log error with non-Error objects', () => {
            logger.error('API', 'Unknown error', 'string error');

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('[ERROR]'),
                'Unknown error',
                expect.objectContaining({
                    error: expect.objectContaining({
                        name: 'Error',
                        message: 'string error',
                    })
                })
            );
        });

        it('should always log error regardless of minLevel', () => {
            logger.configure({ minLevel: 'error' });
            logger.error('TestContext', 'Error message', new Error('test'));

            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    describe('time / timeEnd', () => {
        it('should log time measurements', () => {
            logger.time('Performance', 'Operation');
            logger.timeEnd('Performance', 'Operation');

            expect(consoleTimeSpy).toHaveBeenCalledWith('[Performance] Operation');
            expect(consoleTimeEndSpy).toHaveBeenCalledWith('[Performance] Operation');
        });

        it('should not log time when minLevel is higher than debug', () => {
            logger.configure({ minLevel: 'info' });
            logger.time('Performance', 'Operation');
            logger.timeEnd('Performance', 'Operation');

            expect(consoleTimeSpy).not.toHaveBeenCalled();
            expect(consoleTimeEndSpy).not.toHaveBeenCalled();
        });
    });

    describe('child logger', () => {
        it('should create child logger with fixed context', () => {
            const authLogger = logger.child('Auth');
            authLogger.info('Login successful');

            expect(consoleInfoSpy).toHaveBeenCalledWith(
                expect.stringContaining('[INFO]'),
                'Login successful',
                expect.any(Object)
            );
        });

        it('child logger should inherit configuration', () => {
            logger.configure({ minLevel: 'warn' });
            const childLogger = logger.child('Child');
            childLogger.info('This should not appear');
            childLogger.warn('This should appear');

            expect(consoleInfoSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalled();
        });

        it('child logger should support all log levels', () => {
            const childLogger = logger.child('Test');

            childLogger.debug('Debug message');
            childLogger.info('Info message');
            childLogger.warn('Warning message');
            childLogger.error('Error message');

            expect(consoleDebugSpy).toHaveBeenCalled();
            expect(consoleInfoSpy).toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    describe('configuration', () => {
        it('should update configuration', () => {
            logger.configure({ minLevel: 'error' });
            logger.warn('TestContext', 'Warning');
            logger.error('TestContext', 'Error', new Error('test'));

            expect(consoleWarnSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it('should merge partial configuration', () => {
            logger.configure({ includeTimestamp: false });
            logger.info('TestContext', 'Message');

            // Should not contain timestamp when disabled
            const callArg = consoleInfoSpy.mock.calls[0][0];
            expect(callArg).not.toMatch(/^\[\d{4}-\d{2}-\d{2}/);
        });
    });

    describe('production environment', () => {
        it('should behave correctly when configured for production', () => {
            // Simulate production config (errors only, no debug)
            logger.configure({
                enabled: true,
                minLevel: 'error',
                includeTimestamp: true,
            });

            logger.debug('TestContext', 'Debug');
            logger.info('TestContext', 'Info');
            logger.warn('TestContext', 'Warn');
            logger.error('TestContext', 'Error', new Error('test'));

            expect(consoleDebugSpy).not.toHaveBeenCalled();
            expect(consoleInfoSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledOnce();
        });
    });
});
