const opentracing = require('opentracing');
const Tracer = require('../index');
const zipkin = require('zipkin');

// FollowsFrom is not supported by open tracing
describe('Opentracing interface', () => {
    it('should fail to init tracer without a service name', () => {
        expect(() => {
            new Tracer();
        }).toThrow();
    });

    it('should fail to init tracer without a recorder', () => {
        expect(() => {
            new Tracer({
                serviceName: 'MyService',
            });
        }).toThrow();
    });
    it('should create a tracer', () => {
        const tracer = new Tracer({
            serviceName: 'MyService',
            recorder: {},
        });

        expect(tracer).toBeInstanceOf(Tracer);
    });

    it('should initialize a zipkin tracer', () => {
        const tracer = new Tracer({
            serviceName: 'MyService',
            recorder: {},
        });

        expect(zipkin.Tracer).toHaveBeenCalled();
    });

    it('should set a global tracer', () => {
        opentracing.initGlobalTracer(
            new Tracer({
                serviceName: 'MyService',
                recorder: {},
            })
        );

        const tracer = opentracing.globalTracer();
        expect(tracer.startSpan).toBeInstanceOf(Function);
    });

    it('should support 128bit trace Ids lengths');

    describe('spans', () => {
        let tracer;
        let zipkinTracer;
        beforeEach(() => {
            tracer = new Tracer({ serviceName: 'MyService', recorder: {} });
            zipkinTracer = tracer._zipkinTracer;
            zipkinTracer.scoped.mockReset();
        });

        it('should not start a span without an operation name', () => {
            expect(() => {
                tracer.startSpan();
            }).toThrowError();
        });

        it('startSpan should start a span', () => {
            zipkinTracer.createRootId.mockImplementationOnce(() => 42);
            tracer.startSpan('MyName');

            // should do it in a scope
            expect(zipkinTracer.scoped).toHaveBeenCalled();
            zipkinTracer.scoped.mock.calls[0][0]();

            expect(zipkinTracer.createRootId).toHaveBeenCalled();
            expect(zipkinTracer.setId).toHaveBeenCalledWith(42);
            expect(zipkinTracer.recordBinary).toHaveBeenCalledWith(
                'spanName',
                'MyName'
            );
            expect(zipkinTracer.recordServiceName).toHaveBeenCalledWith(
                'MyService'
            );
        });

        it('should start a span with parent span', () => {
            const parent = tracer.startSpan('ParentSpan');
            // Constructor of parent span
            expect(zipkinTracer.scoped).toHaveBeenCalled();
            zipkinTracer.scoped.mock.calls[0][0]();
            zipkinTracer.scoped.mockReset();

            // make sure we habe the right ids set at the parent
            expect(parent.id.traceId).toBeTruthy();
            expect(parent.id.parentId).toBeTruthy();

            const child = tracer.startSpan('ChildSpan', { childOf: parent });
            // Constructor of child span
            expect(zipkinTracer.scoped).toHaveBeenCalled();
            zipkinTracer.scoped.mock.calls[0][0]();
            zipkinTracer.scoped.mockReset();

            expect(zipkin.TraceId).toHaveBeenCalled();

            // Uses TraceId to get a new TraceId
            const call = zipkin.TraceId.mock.calls[0][0];
            expect(call.traceId).toEqual(parent.traceId);
            expect(call.parentId).toEqual(parent.spanId);

            // We cant assert on spanId of the child, because it is overwritten by the construction of TraceId
            expect(child.id.traceId).toEqual(parent.traceId);
            expect(child.id.parentId).toEqual(parent.spanId);
        });

        describe('span object', () => {
            let span;
            beforeEach(() => {
                span = tracer.startSpan('Ponyfoo');

                expect(zipkinTracer.scoped).toHaveBeenCalled();
                zipkinTracer.scoped.mock.calls[0][0](); // TODO: move to inside mock with next tick function
                zipkinTracer.scoped.mockReset();
                zipkinTracer.recordAnnotation.mockReset();
            });

            it('should expose spanId', () => {
                expect(span.id).toBeDefined();

                // Test if mock is sufficient
                expect(span.id.traceId).toBeDefined();
                expect(span.id.parentId).toBeDefined();
                expect(span.id.spanId).toBeDefined();
                expect(span.id.sampled).toBeDefined();
            });

            it('should log data', () => {
                span.log({ event: 'data_received', data: '42' });

                // should do it in a scope
                expect(zipkinTracer.scoped).toHaveBeenCalled();
                zipkinTracer.scoped.mock.calls[0][0]();

                expect(zipkinTracer.recordBinary).toHaveBeenCalledWith(
                    'event',
                    'data_received'
                );
                expect(zipkinTracer.recordBinary).toHaveBeenCalledWith(
                    'data',
                    '42'
                );
            });

            it('should use the right id in log', () => {
                const otherSpan = tracer.startSpan('Other Span');

                zipkinTracer.scoped.mockReset();
                zipkinTracer.setId.mockReset();
                span.log({ event: 'other event' });

                // should do it in a scope
                expect(zipkinTracer.scoped).toHaveBeenCalled();
                zipkinTracer.scoped.mock.calls[0][0]();
                expect(zipkinTracer.setId).toHaveBeenLastCalledWith(span.id);
                zipkinTracer.scoped.mockReset();
                zipkinTracer.setId.mockReset();

                otherSpan.log({ event: 'yet another event' });
                // should do it in a scope
                expect(zipkinTracer.scoped).toHaveBeenCalled();
                zipkinTracer.scoped.mock.calls[0][0]();
                expect(zipkinTracer.setId).toHaveBeenLastCalledWith(
                    otherSpan.id
                );
            });

            it('should not fail without an argument', () => {
                expect(() => {
                    span.log();
                    // should do it in a scope
                    expect(zipkinTracer.scoped).toHaveBeenCalled();
                    zipkinTracer.scoped.mock.calls[0][0]();
                }).not.toThrow();
            });

            it('should finish a span', () => {
                span.finish();

                expect(zipkinTracer.scoped).toHaveBeenCalled();
                zipkinTracer.scoped.mock.calls[0][0]();

                // XXX: assert a more specific thing here based on whatsoever
                expect(zipkin.Annotation.ServerSend).toHaveBeenCalled();
                expect(zipkinTracer.recordAnnotation).toHaveBeenCalled();
            });

            it('should use the right id in finish', () => {
                const otherSpan = tracer.startSpan('Other Span');

                zipkinTracer.scoped.mockReset();
                zipkinTracer.setId.mockReset();
                span.finish();

                // should do it in a scope
                expect(zipkinTracer.scoped).toHaveBeenCalled();
                zipkinTracer.scoped.mock.calls[0][0]();
                expect(zipkinTracer.setId).toHaveBeenLastCalledWith(span.id);
                zipkinTracer.scoped.mockReset();
                zipkinTracer.setId.mockReset();

                otherSpan.finish();
                // should do it in a scope
                expect(zipkinTracer.scoped).toHaveBeenCalled();
                zipkinTracer.scoped.mock.calls[0][0]();
                expect(zipkinTracer.setId).toHaveBeenLastCalledWith(
                    otherSpan.id
                );
            });

            // TODO: supported tags: https://github.com/opentracing/specification/blob/master/semantic_conventions.md#span-tags-table
            // XXX: find difference between tags and logs
            it('should use the right id in setTags');
            it('should setTags');
        });
    });

    describe('usage of sampler', () => {
        it('tracer should be initialize zipkin with a sampler');
        it('span should be aware of sampler');
        it('startSpan with parent should use parents sample value');
    });

    describe('usage of recorder', () => {
        it('should initialize zipkin with the recorder');
    });

    describe('inject (serialize)', () => {
        describe('Text Map', () => {
            it('should be implemented');
        });

        describe('HTTP Headers', () => {
            it('should handle child spans correctly');
            it('should handle parent spans correctly');
        });

        describe('Binary', () => {
            it('should be implemented');
        });
    });

    describe('eject (deserialize)', () => {
        describe('Text Map', () => {
            it('should be implemented');
        });

        describe('HTTP Headers', () => {
            it('should handle child spans correctly');
            it('should handle parent spans correctly');
        });

        describe('Binary', () => {
            it('should be implemented');
        });
    });
});
