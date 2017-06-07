module.exports = {
    Annotation: {
        ClientRecv: jest.fn(),
        ClientSend: jest.fn(),
        ServerRecv: jest.fn(),
        ServerSend: jest.fn(),
    },
    ExplicitContext: jest.fn(),
    Tracer: jest.fn(() => ({
        createRootId: jest.fn(() => ({
            traceId: 'traceId:' + new Date() + Math.random(),
            parentId: 'parentId:' + new Date() + Math.random(),
            spanId: 'spanId:' + new Date() + Math.random(),
            sampled: 'sampled:' + new Date() + Math.random(),
        })),
        recordAnnotation: jest.fn(),
        recordBinary: jest.fn(),
        recordServiceName: jest.fn(),
        scoped: jest.fn(cb => process.nextTick(cb)),
        setId: jest.fn(),
    })),
    TraceId: jest.fn(traceId => Object.assign({}, traceId)),
    Request: {
        addZipkinHeaders: jest.fn((_, base) => ({
            headers: {
                'X-B3-TraceId': base.traceId,
                'X-B3-SpanId': base.spanId,
                'X-B3-Sampled': base.sampled,
            },
        })),
    },
    HttpHeaders: {
        TraceId: 'X-B3-TraceId',
        SpanId: 'X-B3-SpanId',
        ParentSpanId: 'X-B3-ParentSpanId',
        Sampled: 'X-B3-Sampled',
        Flags: 'X-B3-Flags',
    },
    option: require('zipkin-option'),
};
