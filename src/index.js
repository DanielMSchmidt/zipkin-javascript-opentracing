const {
  Annotation,
  BatchRecorder,
  ExplicitContext,
  Request,
  TraceId, // this is used as OpenTracing.SpanContext
  option: { Some, None },
  Tracer,
  InetAddress,
  sampler,
  jsonEncoder
} = require("zipkin");
const { HttpLogger } = require("zipkin-transport-http");
const OpenTracing = require("opentracing");
const availableTags = OpenTracing.Tags;
const { FORMAT_BINARY, FORMAT_TEXT_MAP, FORMAT_HTTP_HEADERS } = OpenTracing;
const { JSON_V2 } = jsonEncoder;

const HttpHeaders = {
  TraceId: "x-b3-traceid",
  ParentSpanId: "x-b3-parentspanid",
  SpanId: "x-b3-spanid",
  Sampled: "x-b3-sampled"
};

const startSpanAnnotation = {
  client: Annotation.ClientSend,
  local: Annotation.ClientSend, // waiting for local PR in zipkin to get merged
  server: Annotation.ServerRecv
};

const addressAnnotation = {
  client: Annotation.ClientAddr,
  local: Annotation.ClientAddr, // waiting for local PR in zipkin to get merged
  server: Annotation.ServerAddr
};

const finishSpanAnnotation = {
  client: Annotation.ClientRecv,
  local: Annotation.ClientRecv, // waiting for local PR in zipkin to get merged
  server: Annotation.ServerSend
};

// copied from https://github.com/openzipkin/zipkin-js/blob/08f86b63a5fd7ded60762f537be1845ede588ffa/packages/zipkin/src/tracer/randomTraceId.js
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

function SpanCreator({ otTracer, tracer, serviceName, kind, sampler }) {
  return class Span extends OpenTracing.Span {
    _getTraceId(options) {
      // construct with parent
      // for "references" see: https://github.com/opentracing/opentracing-javascript/blob/d2c1c6a5a50439bd769d02c7f4638293db40140a/src/tracer.ts#L79-L93
      const childOf =
        options.references &&
        options.references.find(
          r => r.type() === OpenTracing.REFERENCE_CHILD_OF
        );
      const followsFrom =
        options.references &&
        options.references.find(
          r => r.type() === OpenTracing.REFERENCE_FOLLOWS_FROM
        );
      const parent = childOf || followsFrom; // prefer "child-of" refs over "follows-from" refs as "parent"
      const parentCtx = parent && parent.referencedContext();
      if (parentCtx) {
        // with newer zipkin version switch to:
        // return tracer.scoped(() => {
        //   tracer.setId(parentCtx);
        //   return tracer.createChildId();
        // });

        return new TraceId({
          traceId: makeOptional(parentCtx.traceId),
          parentId: makeOptional(parentCtx.spanId),
          spanId: randomTraceId(),
          sampled: makeOptional(parentCtx.sampled)
        });
      }

      // construct from give traceId
      return tracer.createRootId();
    }

    constructor(spanName, options) {
      super();

      this.id = this._getTraceId(options);

      tracer.scoped(() => {
        tracer.setId(this.id);
        if (spanName) {
          tracer.recordAnnotation(new Annotation.Rpc(spanName));
        }

        tracer.recordServiceName(serviceName);
        tracer.recordAnnotation(new startSpanAnnotation[kind]());
      });
    }

    _tracer() {
      return otTracer;
    }
    _context() {
      return this.id;
    }

    // TODO: ??? _setOperationName(newName) { this._name = newName; }

    // TODO: ??? _setBaggageItem(key, value) { this.context()._baggage[key] = value; }
    // TODO: ??? _getBaggageItem(key) { return this.context()._baggage[key]; }

    _addTags(tags) {
      tracer.scoped(() => {
        // make sure correct id is set
        tracer.setId(this.id);

        Object.entries(tags).map(([key, value]) => {
          // some tags are treated specially by Zipkin
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

              const address = { serviceName, host, port };

              tracer.recordAnnotation(new addressAnnotation[kind](address));
              break;

            // Otherwise, set arbitrary key/value tags using Zipkin binary annotations
            default:
              tracer.recordAnnotation(
                new Annotation.BinaryAnnotation(key, value)
              );
          }
        });
      });
    }

    _log(fields, timestamp) {
      tracer.scoped(() => {
        // make sure correct id is set
        tracer.setId(this.id);

        if (fields) {
          Object.entries(fields).map(([key, value]) => {
            tracer.recordBinary(key, value);
          });
        }

        // TODO: support for passed-in timestamp?
      });
    }

    _finish(finishTime) {
      tracer.scoped(() => {
        // make sure correct id is set
        tracer.setId(this.id);
        tracer.recordAnnotation(new finishSpanAnnotation[kind]());
      });

      // TODO: support for finishTime?
    }
  };
}

class Tracing extends OpenTracing.Tracer {
  constructor(options = {}) {
    super();

    // serviceName: the name of the service monitored with this tracer
    if (typeof options.serviceName !== "string") {
      throw new Error("serviceName option needs to be provided");
    }

    if (typeof options.recorder !== "object") {
      if (typeof options.endpoint !== "string") {
        throw new Error("recorder or endpoint option needs to be provided");
      }

      if (options.endpoint.indexOf("http") === -1) {
        throw new Error(
          "endpoint value needs to start with http:// or https://"
        );
      }

      options.recorder = new BatchRecorder({
        logger: new HttpLogger({
          endpoint: options.endpoint + "/api/v2/spans",
          jsonEncoder: JSON_V2
        })
      });
    }

    if (
      options.kind !== "client" &&
      options.kind !== "server" &&
      options.kind !== "local"
    ) {
      throw new Error(
        'kind option needs to be provided as either "local", "client" or "server"'
      );
    }

    options.sampler = options.sampler || sampler.alwaysSample;

    this._serviceName = options.serviceName;

    this._zipkinTracer = new Tracer({
      ctxImpl: new ExplicitContext(),
      recorder: options.recorder
    });
    this._Span = SpanCreator({
      otTracer: this,
      tracer: this._zipkinTracer,
      serviceName: this._serviceName,
      kind: options.kind,
      sampler: options.sampler
    });
  }

  _startSpan(name, options) {
    if (typeof name !== "string") {
      throw new Error(
        `startSpan needs an operation name as string as first argument.
                For more details, please see https://github.com/opentracing/specification/blob/master/specification.md#start-a-new-span`
      );
    }

    return new this._Span(name, options);
  }

  _inject(spanCtx, format, carrier) {
    if (typeof spanCtx !== "object") {
      throw new Error("inject called without a span");
    }

    if (format !== Tracing.FORMAT_HTTP_HEADERS) {
      throw new Error("inject called with unsupported format");
    }

    if (typeof carrier !== "object") {
      throw new Error("inject called without a carrier object");
    }

    carrier[HttpHeaders.TraceId] = spanCtx.traceId;
    carrier[HttpHeaders.SpanId] = spanCtx.spanId;
    carrier[HttpHeaders.ParentSpanId] = spanCtx.parentId;
    carrier[HttpHeaders.Sampled] = spanCtx.sampled.getOrElse("0");
  }

  _extract(format, carrier) {
    if (format !== Tracing.FORMAT_HTTP_HEADERS) {
      throw new Error("extract called with unsupported format");
    }

    if (typeof carrier !== "object") {
      throw new Error("extract called without a carrier");
    }

    if (!carrier[HttpHeaders.TraceId]) {
      return null;
    }

    return new TraceId({
      traceId: makeOptional(carrier[HttpHeaders.TraceId]),
      parentId: makeOptional(carrier[HttpHeaders.ParentSpanId]),
      spanId: carrier[HttpHeaders.SpanId],
      sampled: makeOptional(carrier[HttpHeaders.Sampled])
    });
  }
}

// These values should match https://github.com/opentracing/opentracing-javascript/blob/master/src/constants.ts
Tracing.FORMAT_TEXT_MAP = FORMAT_TEXT_MAP;
Tracing.FORMAT_HTTP_HEADERS = FORMAT_HTTP_HEADERS;
Tracing.FORMAT_BINARY = FORMAT_BINARY;

// For testing purposes
Tracing.makeOptional = makeOptional;

module.exports = Tracing;
