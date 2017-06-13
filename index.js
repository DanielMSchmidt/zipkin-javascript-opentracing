const {
    Annotation,
    ExplicitContext,
    Request,
    TraceId,
    option: { Some, None },
    Tracer,
} = require('zipkin');

const HttpHeaders = {
    TraceId: 'x-b3-traceid',
    ParentSpanId: 'x-b3-parentspanid',
    SpanId: 'x-b3-spanid',
    Sampled: 'x-b3-sampled',
};

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

function makeOptional(val) {
    if (
        val &&
        typeof val.toString === 'function' &&
        (val.toString().indexOf('Some') !== -1 ||
            val.toString().indexOf('None') !== -1)
    ) {
        return val;
    }

    if (val != null) {
        return new Some(val);
    } else {
        return None;
    }
}

function getSendAnnotation(kind) {
    // console.log('getSendAnnotation', kind);
    return kind === 'server'
        ? new Annotation.ServerSend()
        : new Annotation.ClientSend();
}

function getReceiveAnnotation(kind) {
    // console.log('getReceiveAnnotation', kind);
    return kind === 'server'
        ? new Annotation.ServerRecv()
        : new Annotation.ClientRecv();
}

function SpanCreator({ tracer, serviceName }) {
    return class Span {
        getTraceId(options) {
            // construct from give traceId
            if (
                typeof options.traceId === 'object' &&
                typeof options.traceId.spanId === 'string'
            ) {
                const { traceId, parentId, spanId, sampled } = options.traceId;
                return new TraceId({
                    traceId: makeOptional(traceId),
                    parentId: makeOptional(parentId),
                    spanId: spanId,
                    sampled: makeOptional(sampled),
                });
            }

            // construct with parent
            if (typeof options.childOf === 'object') {
                const parent = options.childOf;

                return new TraceId({
                    traceId: makeOptional(parent.traceId),
                    parentId: makeOptional(parent.id.spanId),
                    spanId: randomTraceId(),
                    sampled: parent.id.sampled,
                });
            }

            // construct from give traceId
            return tracer.createRootId();
        }

        constructor(spanName, options) {
            const id = this.getTraceId(options);
            this.id = id;
            this.kind = options.kind;

            tracer.scoped(() => {
                tracer.setId(id);
                spanName !== '' && tracer.recordBinary('spanName', spanName);
                tracer.recordServiceName(serviceName);
                tracer.recordAnnotation(getReceiveAnnotation(options.kind));
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
                tracer.recordAnnotation(getSendAnnotation(this.kind));
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

        if (options.kind !== 'client' && options.kind !== 'server') {
            throw new Error(
                'startSpan needs a kind of "server" or "kind" set, was',
                options.kind
            );
        }

        // XXX: expect kind to be set

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

        carrier[HttpHeaders.TraceId] = span.id.traceId;
        carrier[HttpHeaders.SpanId] = span.id.spanId;
        carrier[HttpHeaders.ParentSpanId] = span.id.parentId;
        carrier[HttpHeaders.Sampled] = span.id.sampled.getOrElse('0');
    }

    extract(format, carrier) {
        if (format !== Tracing.FORMAT_HTTP_HEADERS) {
            throw new Error('extract called with unsupported format');
        }

        if (typeof carrier !== 'object') {
            throw new Error('extract called without a carrier');
        }

        // XXX: no empty string here v
        // We should send the span name too
        // TODO: take a look for span name here: https://github.com/openzipkin/zipkin-go-opentracing/blob/594640b9ef7e5c994e8d9499359d693c032d738c/propagation_ot.go#L26
        const span = new this._Span('', {
            traceId: {
                traceId: carrier[HttpHeaders.TraceId],
                parentId: carrier[HttpHeaders.ParentSpanId],
                spanId: carrier[HttpHeaders.SpanId],
                sampled: carrier[HttpHeaders.Sampled],
            },
            kind: 'server', // This depends on what kind the send span is, we need to send that through
        });

        return span;
    }
}

Tracing.FORMAT_TEXT_MAP = 'FORMAT_TEXT_MAP';
Tracing.FORMAT_HTTP_HEADERS = 'FORMAT_HTTP_HEADERS';
Tracing.FORMAT_BINARY = 'FORMAT_BINARY';

Tracing.makeOptional = makeOptional;

module.exports = Tracing;
