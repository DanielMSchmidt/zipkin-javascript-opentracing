const opentracing = require('opentracing');
const Tracer = require('../index');
const zipkin = require('zipkin');

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

        // used for extracted spans
        it('should start a span with no name, provided an empty string', () => {
            tracer.startSpan('', { kind: 'client' });

            // should do it in a scope
            expect(zipkinTracer.scoped).toHaveBeenCalled();
            zipkinTracer.scoped.mock.calls[0][0]();

            expect(zipkinTracer.recordBinary).not.toHaveBeenCalled();
        });

        it('should not start a span without a kind being set', () => {
            expect(() => {
                tracer.startSpan('foo', {});
            }).toThrowError();
        });

        it('startSpan should start a span', () => {
            zipkinTracer.createRootId.mockImplementationOnce(() => 42);
            tracer.startSpan('MyName', { kind: 'server' });

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
            const parent = tracer.startSpan('ParentSpan', { kind: 'server' });
            // Constructor of parent span
            expect(zipkinTracer.scoped).toHaveBeenCalled();
            zipkinTracer.scoped.mock.calls[0][0]();
            zipkinTracer.scoped.mockReset();

            // make sure we habe the right ids set at the parent
            expect(parent.id.traceId).toBeTruthy();
            expect(parent.id.parentId).toBeTruthy();

            const child = tracer.startSpan('ChildSpan', {
                childOf: parent,
                kind: 'server',
            });
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
                span = tracer.startSpan('Ponyfoo', { kind: 'client' });

                expect(zipkinTracer.scoped).toHaveBeenCalled();
                zipkinTracer.scoped.mock.calls[0][0]();
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
                const otherSpan = tracer.startSpan('Other Span', {
                    kind: 'client',
                });

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

                expect(zipkin.Annotation.ClientRecv).toHaveBeenCalled();
                expect(zipkin.Annotation.ClientSend).toHaveBeenCalled();
                expect(zipkinTracer.recordAnnotation).toHaveBeenCalled();
            });

            it('should send the right annotations for client', () => {
                span = tracer.startSpan('Ponyfoo', { kind: 'client' });

                expect(zipkinTracer.scoped).toHaveBeenCalled();
                zipkinTracer.scoped.mock.calls[0][0]();
                expect(zipkin.Annotation.ClientRecv).toHaveBeenCalled();
                span.finish();

                zipkinTracer.scoped.mock.calls[1][0]();
                expect(zipkin.Annotation.ClientSend).toHaveBeenCalled();
                expect(zipkinTracer.recordAnnotation).toHaveBeenCalledTimes(2);
            });

            it('should send the right annotations for server', () => {
                span = tracer.startSpan('Ponyfoo', { kind: 'server' });

                expect(zipkinTracer.scoped).toHaveBeenCalled();
                zipkinTracer.scoped.mock.calls[0][0]();
                expect(zipkin.Annotation.ServerRecv).toHaveBeenCalled();
                span.finish();

                zipkinTracer.scoped.mock.calls[1][0]();
                expect(zipkin.Annotation.ServerSend).toHaveBeenCalled();
                expect(zipkinTracer.recordAnnotation).toHaveBeenCalledTimes(2);
            });

            it('should use the right id in finish', () => {
                const otherSpan = tracer.startSpan('Other Span', {
                    kind: 'server',
                });

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

        it('should expose inject/extract formats', () => {
            expect(Tracer.FORMAT_TEXT_MAP).toBeDefined();
            expect(Tracer.FORMAT_HTTP_HEADERS).toBeDefined();
            expect(Tracer.FORMAT_BINARY).toBeDefined();
        });
    });

    describe('usage of sampler', () => {
        it('tracer should be initialize zipkin with a sampler');
        it('span should be aware of sampler');
        it('startSpan with parent should use parents sample value');
    });

    describe('usage of recorder', () => {
        it('should initialize zipkin with the recorder provided', () => {
            new Tracer({
                serviceName: 'MyService',
                recorder: { id: 42 },
            });

            expect(zipkin.Tracer).toHaveBeenCalledWith({
                ctxImpl: {},
                recorder: { id: 42 },
            });
        });
    });

    describe('inject (serialize)', () => {
        let tracer;
        let zipkinTracer;
        beforeEach(() => {
            tracer = new Tracer({ serviceName: 'MyService', recorder: {} });
            zipkinTracer = tracer._zipkinTracer;
        });

        // not relevant for us
        describe('Text Map', () => {
            it('should throw an error, because it is unsupported', () => {
                const span = tracer.startSpan('Span', { kind: 'server' });

                expect(zipkinTracer.scoped).toHaveBeenCalled();
                zipkinTracer.scoped.mock.calls[0][0]();

                expect(() => {
                    const carrier = {};
                    tracer.inject(span, Tracer.FORMAT_TEXT_MAP, carrier);
                }).toThrow();
            });
        });

        describe('HTTP Headers', () => {
            it('should throw without a span', () => {
                expect(() => {
                    const carrier = {};
                    tracer.inject(
                        undefined,
                        Tracer.FORMAT_HTTP_HEADERS,
                        carrier
                    );
                }).toThrow();
            });

            it('should throw without a carrier', () => {
                const span = tracer.startSpan('Span', { kind: 'server' });

                expect(zipkinTracer.scoped).toHaveBeenCalled();
                zipkinTracer.scoped.mock.calls[0][0]();
                expect(() => {
                    tracer.inject(span, Tracer.FORMAT_HTTP_HEADERS);
                }).toThrow();
            });

            it('should call the underlying method', () => {
                const span = tracer.startSpan('Span', { kind: 'server' });

                expect(zipkinTracer.scoped).toHaveBeenCalled();
                zipkinTracer.scoped.mock.calls[0][0]();

                const carrier = { couldBe: 'anything request related' };
                tracer.inject(span, Tracer.FORMAT_HTTP_HEADERS, carrier);

                expect(
                    zipkin.Request.addZipkinHeaders
                ).toHaveBeenLastCalledWith({}, span.id);
            });
        });

        // not relevant for us
        describe('Binary', () => {
            it('should throw an error, because it is unsupported', () => {
                const span = tracer.startSpan('Span', { kind: 'server' });
                expect(() => {
                    const carrier = {};
                    tracer.inject(span, Tracer.FORMAT_BINARY, carrier);
                }).toThrow();
            });
        });
    });

    describe('extract (deserialize)', () => {
        let tracer;
        let zipkinTracer;
        beforeEach(() => {
            tracer = new Tracer({ serviceName: 'MyService', recorder: {} });
            zipkinTracer = tracer._zipkinTracer;
        });

        // not relevant for us
        describe('Text Map', () => {
            it('should throw an error, because it is unsupported', () => {
                expect(() => {
                    const carrier = {};
                    tracer.extract(Tracer.FORMAT_TEXT_MAP, carrier);
                }).toThrow();
            });
        });

        describe('HTTP Headers', () => {
            it('should fail with an invalid carrier', () => {
                expect(() => {
                    tracer.extract(Tracer.FORMAT_HTTP_HEADERS, true);
                }).toThrow();
            });

            it('should return a valid without http headers', () => {
                expect(() => {
                    const span = tracer.extract(Tracer.FORMAT_HTTP_HEADERS, {});
                    expect(zipkinTracer.scoped).toHaveBeenCalled();
                    zipkinTracer.scoped.mock.calls[0][0]();

                    expect(span.id.traceId).toBeDefined();
                    expect(span.id.spanId).toBeDefined();
                    expect(span.id.sampled).toBeDefined();
                    expect(span.log).toBeInstanceOf(Function);
                    expect(span.finish).toBeInstanceOf(Function);
                }).not.toThrow();
            });

            it('should handle child spans correctly', () => {
                const httpHeaders = {
                    'X-B3-TraceId': 'myTraceId',
                    'X-B3-SpanId': 'mySpanId',
                    'X-B3-Sampled': '1',
                };
                const span = tracer.extract(
                    Tracer.FORMAT_HTTP_HEADERS,
                    httpHeaders
                );
                expect(zipkinTracer.scoped).toHaveBeenCalled();
                zipkinTracer.scoped.mock.calls[0][0]();

                expect(span.id.traceId.value).toBe('myTraceId');
                expect(span.id.spanId.value).toBe('mySpanId');
                expect(span.id.sampled.value).toBe('1');
                expect(span.log).toBeInstanceOf(Function);
                expect(span.finish).toBeInstanceOf(Function);
            });

            it('should handle parent spans correctly', () => {
                const httpHeaders = {
                    'X-B3-TraceId': 'myTraceId',
                    'X-B3-SpanId': 'mySpanId',
                    'X-B3-ParentSpanId': 'myParentSpanId',
                    'X-B3-Sampled': '1',
                };
                const span = tracer.extract(
                    Tracer.FORMAT_HTTP_HEADERS,
                    httpHeaders
                );
                expect(zipkinTracer.scoped).toHaveBeenCalled();
                zipkinTracer.scoped.mock.calls[0][0]();

                expect(span.id.traceId.value).toBe('myTraceId');
                expect(span.id.spanId.value).toBe('mySpanId');
                expect(span.id.parentId.value).toBe('myParentSpanId');
                expect(span.id.sampled.value).toBe('1');
                expect(span.log).toBeInstanceOf(Function);
                expect(span.finish).toBeInstanceOf(Function);
            });
        });

        // not relevant for us
        describe('Binary', () => {
            expect(() => {
                const carrier = {};
                tracer.extract(Tracer.FORMAT_BINARY, carrier);
            }).toThrow();
        });
    });
});
