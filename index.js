const {
    Annotation,
    ExplicitContext,
    Tracer,
    TraceId,
    Request,
} = require('zipkin');

// copied from https://github.com/openzipkin/zipkin-js/blob/master/packages/zipkin/src/tracer/randomTraceId.js
function randomTraceId() {
    // === Generate a random 64-bit number in fixed-length hex format
    const digits = '0123456789abcdef';
    let n = '';
    for (let i = 0; i < 16; i++) {
        const rand = Math.floor(Math.random() * 16);
        n += digits[rand];
    }
    return n;
}

function SpanCreator({ tracer, serviceName }) {
    return class Span {
        constructor(spanName, options) {
            let id;
            if (typeof options.childOf === 'object') {
                const parent = options.childOf;
                id = new TraceId({
                    traceId: parent.traceId,
                    parentId: parent.spanId,
                    spanId: randomTraceId(),
                });
            } else {
                id = tracer.createRootId();
            }
            this.id = id;

            tracer.scoped(() => {
                tracer.setId(id);
                tracer.recordBinary('spanName', spanName);
                tracer.recordServiceName(serviceName);
            });
        }

        log(obj = {}) {
            tracer.scoped(() => {
                // make sure correct id is set
                tracer.setId(this.id);

                Object.entries(obj).map(([key, value]) => {
                    tracer.recordBinary(key, value);
                });
            });
        }

        finish() {
            tracer.scoped(() => {
                // make sure correct id is set
                tracer.setId(this.id);
                // XXX: find better annoation than default to ServerSend
                tracer.recordAnnotation(new Annotation.ServerSend());
            });
        }
    };
}

class Tracing {
    constructor(options = {}) {
        // serviceName: the name of the service monitored with this tracer
        if (typeof options.serviceName !== 'string') {
            throw new Error('serviceName option needs to be provided');
        }

        if (typeof options.recorder !== 'object') {
            throw new Error('recorder option needs to be provided');
        }

        this._serviceName = options.serviceName;

        this._zipkinTracer = new Tracer({
            ctxImpl: new ExplicitContext(),
            recorder: options.recorder,
        });
        this._Span = SpanCreator({
            tracer: this._zipkinTracer,
            serviceName: this._serviceName,
        });
    }

    startSpan(name, options = {}) {
        if (typeof name !== 'string') {
            throw new Error(
                `startSpan needs an operation name as string as first argument. 
                For more details, please see https://github.com/opentracing/specification/blob/master/specification.md#start-a-new-span`
            );
        }

        return new this._Span(name, options);
    }

    inject(span, format, carrier) {
        if (typeof span !== 'object') {
            throw new Error('inject called without a span');
        }

        if (format !== Tracing.FORMAT_HTTP_HEADERS) {
            throw new Error('inject called with unsupported format');
        }

        if (typeof carrier !== 'object') {
            throw new Error('inject called without a carrier object');
        }

        const { headers } = Request.addZipkinHeaders({}, span.id);
        Object.assign(carrier, headers);
    }
}

Tracing.FORMAT_TEXT_MAP = 'FORMAT_TEXT_MAP';
Tracing.FORMAT_HTTP_HEADERS = 'FORMAT_HTTP_HEADERS';
Tracing.FORMAT_BINARY = 'FORMAT_BINARY';

module.exports = Tracing;
