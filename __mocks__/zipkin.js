module.exports = {
    Annotation: {
        ServerSend: jest.fn(),
    },
    ExplicitContext: jest.fn(),
    Tracer: jest.fn(() => ({
        createRootId: jest.fn(() => ({
            traceId: 'traceId:' + new Date(),
            parentId: 'parentId:' + new Date(),
            spanId: 'spanId:' + new Date(),
            sampled: 'sampled:' + new Date(),
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
};
