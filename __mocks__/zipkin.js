const None = {
    get type() {
        return 'None';
    },
    map() {
        return None;
    },
    ifPresent() {},
    flatMap() {
        return None;
    },
    getOrElse(f) {
        if (f instanceof Function) {
            return f();
        } else {
            return f;
        }
    },
    equals(other) {
        return other.type === 'None';
    },
    toString() {
        return 'None';
    },
    get present() {
        return false;
    },
};

class Some {
    constructor(value) {
        this.value = value;
    }
    map(f) {
        return new Some(f(this.value));
    }
    ifPresent(f) {
        return this.map(f);
    }
    flatMap(f) {
        return this.map(f).getOrElse(None);
    }
    getOrElse() {
        return this.value;
    }
    equals(other) {
        return other instanceof Some && other.value === this.value;
    }
    toString() {
        return `Some(${this.value.toString()})`;
    }
    get present() {
        return true;
    }
    get type() {
        return 'Some';
    }
}

module.exports = {
    Annotation: {
        ClientRecv: jest.fn(),
        ClientSend: jest.fn(),
        ServerRecv: jest.fn(),
        ServerSend: jest.fn(),
    },
    ExplicitContext: jest.fn(),
    Tracer: jest.fn(() => ({
        createRootId: jest.fn(() => {
            return {
                traceId: new Some('traceId:' + new Date() + Math.random()),
                parentId: new Some('parentId:' + new Date() + Math.random()),
                spanId: 'spanId:' + new Date() + Math.random(),
                sampled: new Some('sampled:' + new Date() + Math.random()),
            };
        }),
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
