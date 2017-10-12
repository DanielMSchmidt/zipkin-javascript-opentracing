const {
  Annotation,
  ExplicitContext,
  Request,
  TraceId,
  option: { Some, None },
  Tracer,
  InetAddress,
  sampler
} = require("zipkin");
const availableTags = require("opentracing").Tags;

const HttpHeaders = {
  TraceId: "x-b3-traceid",
  ParentSpanId: "x-b3-parentspanid",
  SpanId: "x-b3-spanid",
  Sampled: "x-b3-sampled"
};

// copied from https://github.com/openzipkin/zipkin-js/blob/master/packages/zipkin/src/tracer/randomTraceId.js
function randomTraceId() {
  // === Generate a random 64-bit number in fixed-length hex format
  const digits = "0123456789abcdef";
  let n = "";
  for (let i = 0; i < 16; i++) {
    const rand = Math.floor(Math.random() * 16);
    n += digits[rand];
  }
  return n;
}

function makeOptional(val) {
  if (
    val &&
    typeof val.toString === "function" &&
    (val.toString().indexOf("Some") !== -1 ||
      val.toString().indexOf("None") !== -1)
  ) {
    return val;
  }

  if (val != null) {
    return new Some(val);
  } else {
    return None;
  }
}

function SpanCreator({ tracer, serviceName, kind }) {
  return class Span {
    _constructedFromOutside(options) {
      return (
        typeof options.traceId === "object" &&
        typeof options.traceId.spanId === "string"
      );
    }
    _getTraceId(options) {
      // construct from give traceId
      if (this._constructedFromOutside(options)) {
        const { traceId, parentId, spanId, sampled } = options.traceId;
        return new TraceId({
          traceId: makeOptional(traceId),
          parentId: makeOptional(parentId),
          spanId: spanId,
          sampled: makeOptional(sampled)
        });
      }

      // construct with parent
      if (typeof options.childOf === "object") {
        const parent = options.childOf;

        return new TraceId({
          traceId: makeOptional(parent.id.traceId),
          parentId: makeOptional(parent.id.spanId),
          spanId: randomTraceId(),
          sampled: parent.id.sampled
        });
      }

      // construct from give traceId
      return tracer.createRootId();
    }

    constructor(spanName, options) {
      const id = this._getTraceId(options);
      this.id = id;

      tracer.scoped(() => {
        tracer.setId(id);
        if (spanName) {
          tracer.recordAnnotation(new Annotation.Rpc(spanName));
        }

        tracer.recordServiceName(serviceName);

        if (kind === "client") {
          tracer.recordAnnotation(new Annotation.ClientSend());
        } else {
          tracer.recordAnnotation(new Annotation.ServerRecv());
        }
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
    setTag(key, value) {
      if (!Object.values(availableTags).includes(key)) {
        throw new Error(`OpenTracing does not support tag "${key}"`);
      }

      tracer.scoped(() => {
        // make sure correct id is set
        tracer.setId(this.id);

        switch (key) {
          case availableTags.PEER_ADDRESS:
            if (typeof value !== "string") {
              throw new Error(
                `Tag ${availableTags.PEER_ADDRESS} needs a string`
              );
            }

            const host = new InetAddress(value.split(":")[0]);
            const port = value.split(":")[1]
              ? parseInt(value.split(":")[1], 10)
              : 80;

            const address = {
              serviceName,
              host: host,
              port: port
            };

            if (kind === "client") {
              tracer.recordAnnotation(new Annotation.ClientAddr(address));
            } else {
              tracer.recordAnnotation(new Annotation.ServerAddr(address));
            }
            break;

          default:
            throw new Error(`Unsupported tag "${key}" could not be set`);
        }
      });
    }

    finish() {
      tracer.scoped(() => {
        // make sure correct id is set
        tracer.setId(this.id);

        if (kind === "client") {
          tracer.recordAnnotation(new Annotation.ClientRecv());
        } else {
          tracer.recordAnnotation(new Annotation.ServerSend());
        }
      });
    }
  };
}

class Tracing {
  constructor(options = {}) {
    // serviceName: the name of the service monitored with this tracer
    if (typeof options.serviceName !== "string") {
      throw new Error("serviceName option needs to be provided");
    }

    if (typeof options.recorder !== "object") {
      throw new Error("recorder option needs to be provided");
    }

    if (options.kind !== "client" && options.kind !== "server") {
      throw new Error(
        'kind option needs to be provided as either "client" or "server"'
      );
    }

    options.sampler = options.sampler || sampler.alwaysSample;

    this._serviceName = options.serviceName;

    this._zipkinTracer = new Tracer({
      ctxImpl: new ExplicitContext(),
      recorder: options.recorder
    });
    this._Span = SpanCreator({
      tracer: this._zipkinTracer,
      serviceName: this._serviceName,
      kind: options.kind,
      sampler: options.sampler
    });
  }

  startSpan(name, options = {}) {
    if (typeof name !== "string") {
      throw new Error(
        `startSpan needs an operation name as string as first argument.
                For more details, please see https://github.com/opentracing/specification/blob/master/specification.md#start-a-new-span`
      );
    }

    return new this._Span(name, options);
  }

  inject(span, format, carrier) {
    if (typeof span !== "object") {
      throw new Error("inject called without a span");
    }

    if (format !== Tracing.FORMAT_HTTP_HEADERS) {
      throw new Error("inject called with unsupported format");
    }

    if (typeof carrier !== "object") {
      throw new Error("inject called without a carrier object");
    }

    carrier[HttpHeaders.TraceId] = span.id.traceId;
    carrier[HttpHeaders.SpanId] = span.id.spanId;
    carrier[HttpHeaders.ParentSpanId] = span.id.parentId;
    carrier[HttpHeaders.Sampled] = span.id.sampled.getOrElse("0");
  }

  extract(format, carrier) {
    if (format !== Tracing.FORMAT_HTTP_HEADERS) {
      throw new Error("extract called with unsupported format");
    }

    if (typeof carrier !== "object") {
      throw new Error("extract called without a carrier");
    }

    if (!carrier[HttpHeaders.TraceId]) {
      return null;
    }

    // XXX: no empty string here v
    // We should send the span name too
    // TODO: take a look for span name here: https://github.com/openzipkin/zipkin-go-opentracing/blob/594640b9ef7e5c994e8d9499359d693c032d738c/propagation_ot.go#L26
    const span = new this._Span("", {
      traceId: {
        traceId: carrier[HttpHeaders.TraceId],
        parentId: carrier[HttpHeaders.ParentSpanId],
        spanId: carrier[HttpHeaders.SpanId],
        sampled: carrier[HttpHeaders.Sampled]
      }
    });

    return span;
  }
}

Tracing.FORMAT_TEXT_MAP = "FORMAT_TEXT_MAP";
Tracing.FORMAT_HTTP_HEADERS = "FORMAT_HTTP_HEADERS";
Tracing.FORMAT_BINARY = "FORMAT_BINARY";

// For testing purposes
Tracing.makeOptional = makeOptional;

module.exports = Tracing;
