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

    describe('zipkin-javascript-opentracing', () => {
        let tracer;
        beforeEach(() => {
            mockFetch.mockReset();
            const opentracing = require('opentracing');
            const ZipkinJavascriptOpentracing = require('../index');
            tracer = new ZipkinJavascriptOpentracing({
                serviceName: 'My Service',
                recorder: new BatchRecorder({
                    logger: new HttpLogger({
                        endpoint: 'http://localhost:9411/api/v1/spans',
                    }),
                }),
            });
        });

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
