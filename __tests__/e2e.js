jest.disableAutomock();
jest.useFakeTimers();

let mockFetch = jest.fn();
jest.mock('node-fetch', () => (endpoint, ...args) => {
    mockFetch(endpoint, ...args);
    return Promise.resolve({
        status: 202,
    });
});

jest.unmock('zipkin');
jest.unmock('zipkin-transport-http');
jest.unmock('opentracing');

const {
    Annotation,
    BatchRecorder,
    ExplicitContext,
    Tracer,
} = require('zipkin');
const { HttpLogger } = require('zipkin-transport-http');
const fetch = require('node-fetch');
const opentracing = require('opentracing');

const ZipkinJavascriptOpentracing = require('../index');

describe('mock', () => {
    it('should capture fetches', () => {
        fetch('http://foo');
        expect(mockFetch).toHaveBeenCalledWith('http://foo');
    });

    describe('zipkin', () => {
        let tracer;
        beforeEach(() => {
            tracer = new Tracer({
                ctxImpl: new ExplicitContext(),
                recorder: new BatchRecorder({
                    logger: new HttpLogger({
                        endpoint: 'http://localhost:9411/api/v1/spans',
                    }),
                }),
            });
            mockFetch.mockReset();
        });

        describe('startSpan', () => {
            it('should record a simple request', () => {
                tracer.scoped(() => {
                    tracer.setId(tracer.createRootId());
                    tracer.recordServiceName('My Service');
                    tracer.recordBinary('spanName', 'My Span');
                    tracer.recordAnnotation(new Annotation.ServerSend());
                });

                jest.runOnlyPendingTimers();

                expect(mockFetch).toHaveBeenCalled();
                const [
                    endpoint,
                    { method, body, headers },
                ] = mockFetch.mock.calls[0];

                expect(endpoint).toBe('http://localhost:9411/api/v1/spans');
                expect(method).toBe('POST');
                expect(Object.keys(headers)).toEqual(
                    expect.arrayContaining(['Accept', 'Content-Type'])
                );
                const json = JSON.parse(body);
                expect(json.length).toBe(1);
                expect(Object.keys(json[0])).toEqual([
                    'traceId',
                    'name',
                    'id',
                    'annotations',
                    'binaryAnnotations',
                    'timestamp',
                    'duration',
                ]);
                expect(json[0].annotations.length).toBe(1);
                expect(json[0].annotations[0].endpoint.serviceName).toBe(
                    'My Service'
                );
                expect(json[0].binaryAnnotations.length).toBe(1);
                expect(json[0].binaryAnnotations[0].value).toBe('My Span');
            });

            it('should record logs', () => {
                tracer.scoped(() => {
                    tracer.setId(tracer.createRootId());
                    tracer.recordServiceName('My Service');
                    tracer.recordBinary('spanName', 'My Span');
                    tracer.recordBinary('statusCode', '200');
                    tracer.recordBinary('objectId', '42');
                    tracer.recordAnnotation(new Annotation.ServerSend());
                });

                jest.runOnlyPendingTimers();

                expect(mockFetch).toHaveBeenCalled();
                const [
                    endpoint,
                    { method, body, headers },
                ] = mockFetch.mock.calls[0];

                expect(endpoint).toBe('http://localhost:9411/api/v1/spans');
                expect(method).toBe('POST');
                expect(Object.keys(headers)).toEqual(
                    expect.arrayContaining(['Accept', 'Content-Type'])
                );
                const json = JSON.parse(body);
                expect(json.length).toBe(1);
                expect(Object.keys(json[0])).toEqual([
                    'traceId',
                    'name',
                    'id',
                    'annotations',
                    'binaryAnnotations',
                    'timestamp',
                    'duration',
                ]);
                expect(json[0].annotations.length).toBe(1);
                expect(json[0].annotations[0].endpoint.serviceName).toBe(
                    'My Service'
                );
                expect(json[0].binaryAnnotations.length).toBe(3);
                expect(json[0].binaryAnnotations[0].key).toBe('spanName');
                expect(json[0].binaryAnnotations[0].value).toBe('My Span');
                expect(json[0].binaryAnnotations[1].key).toBe('statusCode');
                expect(json[0].binaryAnnotations[1].value).toBe('200');
                expect(json[0].binaryAnnotations[2].key).toBe('objectId');
                expect(json[0].binaryAnnotations[2].value).toBe('42');
            });
        });
    });

    describe('zipkin-javascript-opentracing', () => {
        let tracer;
        beforeEach(() => {
            mockFetch.mockReset();
            tracer = new ZipkinJavascriptOpentracing({
                serviceName: 'My Service',
                recorder: new BatchRecorder({
                    logger: new HttpLogger({
                        endpoint: 'http://localhost:9411/api/v1/spans',
                    }),
                }),
                kind: 'server',
            });
        });

        describe('startSpan', () => {
            it('should record a simple request', () => {
                const span = tracer.startSpan('My Span');
                span.finish();

                jest.runOnlyPendingTimers();

                expect(mockFetch).toHaveBeenCalled();
                const [
                    endpoint,
                    { method, body, headers },
                ] = mockFetch.mock.calls[0];

                expect(endpoint).toBe('http://localhost:9411/api/v1/spans');
                expect(method).toBe('POST');
                expect(Object.keys(headers)).toEqual(
                    expect.arrayContaining(['Accept', 'Content-Type'])
                );
                const json = JSON.parse(body);
                expect(json.length).toBe(1);
                expect(Object.keys(json[0])).toEqual([
                    'traceId',
                    'name',
                    'id',
                    'annotations',
                    'binaryAnnotations',
                ]);
                expect(json[0].annotations.length).toBe(2);
                expect(json[0].annotations[0].endpoint.serviceName).toBe(
                    'My Service'
                );

                expect(json[0].binaryAnnotations.length).toBe(1);
                expect(json[0].binaryAnnotations[0].value).toBe('My Span');
            });

            it('should record logs', () => {
                const span = tracer.startSpan('My Span');
                span.log({
                    statusCode: '200',
                    objectId: '42',
                });

                span.finish();

                jest.runOnlyPendingTimers();

                expect(mockFetch).toHaveBeenCalled();
                const [
                    endpoint,
                    { method, body, headers },
                ] = mockFetch.mock.calls[0];

                expect(endpoint).toBe('http://localhost:9411/api/v1/spans');
                expect(method).toBe('POST');
                expect(Object.keys(headers)).toEqual(
                    expect.arrayContaining(['Accept', 'Content-Type'])
                );
                const json = JSON.parse(body);
                expect(json.length).toBe(1);
                expect(Object.keys(json[0])).toEqual([
                    'traceId',
                    'name',
                    'id',
                    'annotations',
                    'binaryAnnotations',
                ]);
                expect(json[0].annotations.length).toBe(2);
                expect(json[0].annotations[0].endpoint.serviceName).toBe(
                    'My Service'
                );
                expect(json[0].binaryAnnotations.length).toBe(3);
                expect(json[0].binaryAnnotations[0].key).toBe('spanName');
                expect(json[0].binaryAnnotations[0].value).toBe('My Span');
                expect(json[0].binaryAnnotations[1].key).toBe('statusCode');
                expect(json[0].binaryAnnotations[1].value).toBe('200');
                expect(json[0].binaryAnnotations[2].key).toBe('objectId');
                expect(json[0].binaryAnnotations[2].value).toBe('42');
            });
        });

        describe('inject', () => {
            it('should set every defined HTTP Header', () => {
                const span = tracer.startSpan('My Span');

                const carrier = {};
                tracer.inject(
                    span,
                    ZipkinJavascriptOpentracing.FORMAT_HTTP_HEADERS,
                    carrier
                );

                expect(carrier['x-b3-traceid']).toBeDefined();
                expect(carrier['x-b3-spanid']).toBeDefined();
                expect(carrier['x-b3-sampled']).toBeDefined();
            });

            it('should set the parentId', () => {
                const parent = tracer.startSpan('ParentSpan');
                const child = tracer.startSpan('ChildSpan', {
                    childOf: parent,
                });

                const carrier = {};
                tracer.inject(
                    child,
                    ZipkinJavascriptOpentracing.FORMAT_HTTP_HEADERS,
                    carrier
                );

                expect(carrier['x-b3-traceid']).toBeDefined();
                expect(carrier['x-b3-spanid']).toBeDefined();
                expect(carrier['x-b3-parentspanid']).toBeDefined();
                expect(carrier['x-b3-sampled']).toBeDefined();
            });
        });

        describe('extract', () => {
            it('should use the span and trace id of the given headers', () => {
                const previousHeaders = {
                    'x-b3-traceid': '30871be42b0fd4781',
                    'x-b3-spanid': '30871be42b0fd4782',
                };

                const span = tracer.extract(
                    ZipkinJavascriptOpentracing.FORMAT_HTTP_HEADERS,
                    previousHeaders
                );

                span.finish();

                jest.runOnlyPendingTimers();

                expect(mockFetch).toHaveBeenCalled();
                const [
                    endpoint,
                    { method, body, headers },
                ] = mockFetch.mock.calls[0];

                expect(endpoint).toBe('http://localhost:9411/api/v1/spans');
                expect(method).toBe('POST');
                expect(Object.keys(headers)).toEqual(
                    expect.arrayContaining(['Accept', 'Content-Type'])
                );
                const json = JSON.parse(body);
                expect(json[0].traceId).toBe('30871be42b0fd4781');
                expect(json[0].id).toBe('30871be42b0fd4782');
            });
            it('should use the parentId of the given headers', () => {
                const previousHeaders = {
                    'x-b3-traceid': '30871be42b0fd4781',
                    'x-b3-spanid': '30871be42b0fd4782',
                    'x-b3-parentspanid': '30871be42b0fd4783',
                };

                const span = tracer.extract(
                    ZipkinJavascriptOpentracing.FORMAT_HTTP_HEADERS,
                    previousHeaders
                );

                span.finish();

                jest.runOnlyPendingTimers();

                expect(mockFetch).toHaveBeenCalled();
                const [
                    endpoint,
                    { method, body, headers },
                ] = mockFetch.mock.calls[0];

                expect(endpoint).toBe('http://localhost:9411/api/v1/spans');
                expect(method).toBe('POST');
                expect(Object.keys(headers)).toEqual(
                    expect.arrayContaining(['Accept', 'Content-Type'])
                );
                const json = JSON.parse(body);
                expect(json[0].traceId).toBe('30871be42b0fd4781');
                expect(json[0].id).toBe('30871be42b0fd4782');
                expect(json[0].parentId).toBe('30871be42b0fd4783');
            });
        });

        describe('inject + extract', () => {
            let tracer;
            let zipkinTracer;
            beforeEach(() => {
                tracer = new ZipkinJavascriptOpentracing({
                    serviceName: 'MyService',
                    recorder: new BatchRecorder({
                        logger: new HttpLogger({
                            endpoint: 'http://localhost:9411/api/v1/spans',
                        }),
                    }),
                    kind: 'server',
                });
                zipkinTracer = tracer._zipkinTracer;
            });

            describe('HTTP Headers', () => {
                it('should work with injecting and extracting in a row', () => {
                    const span = tracer.startSpan('My Span');

                    const headers = {};
                    tracer.inject(
                        span,
                        ZipkinJavascriptOpentracing.FORMAT_HTTP_HEADERS,
                        headers
                    );
                    const newSpan = tracer.extract(
                        ZipkinJavascriptOpentracing.FORMAT_HTTP_HEADERS,
                        headers
                    );

                    expect(newSpan.id.spanId).toEqual(span.id._spanId);
                    expect(newSpan.id.traceId).toEqual(span.id.traceId);
                });

                it('should work with extracting and injecting in a row', () => {
                    const headers = {
                        'x-b3-sampled': '0',
                        'x-b3-spanid': 'a07ee38e6b11dc0c1',
                        'x-b3-traceid': 'a07ee38e6b11dc0c2',
                        'x-b3-parentspanid': 'a07ee38e6b11dc0c3',
                    };
                    const span = tracer.extract(
                        ZipkinJavascriptOpentracing.FORMAT_HTTP_HEADERS,
                        headers
                    );

                    const newHeaders = {};
                    tracer.inject(
                        span,
                        ZipkinJavascriptOpentracing.FORMAT_HTTP_HEADERS,
                        newHeaders
                    );

                    expect(newHeaders).toEqual(headers);
                });
            });
        });
    });
});
