module.exports = {
    Annotation: {
        ServerSend: jest.fn(),
    },
    ExplicitContext: jest.fn(),
    Tracer: jest.fn().mockImplementation(() => ({
        createRootId: jest.fn().mockImplementation(() => ({
            traceId: 'traceId:' + new Date(),
            parentId: 'parentId:' + new Date(),
            spanId: 'spanId:' + new Date(),
            sampled: 'sampled:' + new Date(),
        })),
        recordAnnotation: jest.fn(),
        recordBinary: jest.fn(),
        recordServiceName: jest.fn(),
        scoped: jest.fn().mockImplementation(cb => process.nextTick(cb)),
        setId: jest.fn(),
    })),
    TraceId: jest
        .fn()
        .mockImplementation(traceId => Object.assign({}, traceId)),
};
