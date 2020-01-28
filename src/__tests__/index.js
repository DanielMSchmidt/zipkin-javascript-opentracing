const opentracing = require("opentracing");
const Tracer = require("../index");
const zipkin = require("zipkin");
const {
  sampler: { Sampler }
} = zipkin;

describe("Opentracing interface", () => {
  it("should fail to init tracer without a service name", () => {
    expect(() => {
      new Tracer();
    }).toThrowErrorMatchingSnapshot();
  });

  it("should fail to init tracer without a recorder", () => {
    expect(() => {
      new Tracer({
        serviceName: "MyService"
      });
    }).toThrowErrorMatchingSnapshot();
  });

  it("should fail to init tracer without a kind", () => {
    expect(() => {
      new Tracer({
        serviceName: "MyService",
        recorder: {}
      });
    }).toThrowErrorMatchingSnapshot();
  });

  it("should fail to init tracer with a malformed kind", () => {
    expect(() => {
      new Tracer({
        serviceName: "MyService",
        recorder: {},
        kind: "mobile"
      });
    }).toThrowErrorMatchingSnapshot();
  });

  it("should create a tracer", () => {
    const tracer = new Tracer({
      serviceName: "MyService",
      recorder: {},
      kind: "server"
    });

    expect(tracer).toBeInstanceOf(Tracer);
  });

  it("should initialize a zipkin tracer", () => {
    const tracer = new Tracer({
      serviceName: "MyService",
      recorder: {},
      kind: "server"
    });

    expect(zipkin.Tracer).toHaveBeenCalled();
  });

  it("should set a global tracer", () => {
    opentracing.initGlobalTracer(
      new Tracer({
        serviceName: "MyService",
        recorder: {},
        kind: "server"
      })
    );

    const tracer = opentracing.globalTracer();
    expect(tracer.startSpan).toBeInstanceOf(Function);
  });

  it("should be have kind server, client and local ", () => {
    expect(() => {
      new Tracer({
        serviceName: "MyService",
        recorder: {},
        kind: "client"
      });
    }).not.toThrowError();

    expect(() => {
      new Tracer({
        serviceName: "MyService",
        recorder: {},
        kind: "server"
      });
    }).not.toThrowError();

    expect(() => {
      new Tracer({
        serviceName: "MyService",
        recorder: {},
        kind: "local"
      });
    }).not.toThrowError();

    expect(() => {
      new Tracer({
        serviceName: "MyService",
        recorder: {},
        kind: "peter"
      });
    }).toThrowErrorMatchingSnapshot();
  });

  it("should support 128bit trace Ids lengths");

  describe("spans", () => {
    let tracer;
    let zipkinTracer;
    beforeEach(() => {
      tracer = new Tracer({
        serviceName: "MyService",
        recorder: {},
        kind: "server"
      });
      zipkinTracer = tracer._zipkinTracer;
      zipkinTracer.scoped.mockReset();
    });

    it("should not start a span without an operation name", () => {
      expect(() => {
        tracer.startSpan();
      }).toThrowError();
    });

    // used for extracted spans
    it("should start a span with no name, provided an empty string", () => {
      tracer.startSpan("");

      // should do it in a scope
      expect(zipkinTracer.scoped).toHaveBeenCalled();
      zipkinTracer.scoped.mock.calls[0][0]();

      expect(zipkinTracer.recordBinary).not.toHaveBeenCalled();
    });

    it("startSpan should start a span", () => {
      zipkinTracer.createRootId.mockImplementationOnce(() => 42);
      tracer.startSpan("MyName");

      // should do it in a scope
      expect(zipkinTracer.scoped).toHaveBeenCalled();
      zipkinTracer.scoped.mock.calls[0][0]();

      expect(zipkinTracer.createRootId).toHaveBeenCalled();
      expect(zipkinTracer.setId).toHaveBeenCalledWith(42);
      expect(zipkin.Annotation.Rpc).toHaveBeenCalledWith("MyName");
      expect(zipkinTracer.recordServiceName).toHaveBeenCalledWith("MyService");
    });

    it("should not fail with parent span set to null", () => {
      const child = tracer.startSpan("ChildSpan", {
        childOf: null,
        kind: "server"
      });
      // Constructor of child span
      expect(zipkinTracer.scoped).toHaveBeenCalled();
      zipkinTracer.scoped.mock.calls[0][0]();
      zipkinTracer.scoped.mockReset();

      expect(zipkinTracer.createRootId).toHaveBeenCalled();
    });

    it("should start a span with parent span", () => {
      const parent = tracer.startSpan("ParentSpan");
      // Constructor of parent span
      expect(zipkinTracer.scoped).toHaveBeenCalled();
      zipkinTracer.scoped.mock.calls[0][0]();
      zipkinTracer.scoped.mockReset();

      // make sure we have the right ids set at the parent
      expect(parent.id.traceId).toBeTruthy();
      expect(parent.id.parentId).toBeTruthy();

      const child = tracer.startSpan("ChildSpan", {
        childOf: parent,
        kind: "server"
      });
      // Constructor of child span
      expect(zipkinTracer.scoped).toHaveBeenCalled();
      zipkinTracer.scoped.mock.calls[0][0]();
      zipkinTracer.scoped.mockReset();

      expect(zipkin.TraceId).toHaveBeenCalled();

      // Uses TraceId to get a new TraceId
      const call = zipkin.TraceId.mock.calls[0][0];
      expect(call.parentId.present).toBeTruthy();
    });

    it("should send a server receive annotation if tracer is of kind server", () => {
      tracer = new Tracer({
        serviceName: "MyService",
        recorder: {},
        kind: "server"
      });
      zipkinTracer = tracer._zipkinTracer;
      zipkinTracer.scoped.mockReset();

      tracer.startSpan("MyName");

      expect(zipkinTracer.scoped).toHaveBeenCalled();
      zipkinTracer.scoped.mock.calls[0][0]();

      expect(zipkin.Annotation.ServerRecv).toHaveBeenCalled();
      expect(zipkinTracer.recordAnnotation).toHaveBeenCalledTimes(2);
    });

    it("should send a client send annotation if tracer is of kind client", () => {
      tracer = new Tracer({
        serviceName: "MyService",
        recorder: {},
        kind: "client"
      });
      zipkinTracer = tracer._zipkinTracer;
      zipkinTracer.scoped.mockReset();

      tracer.startSpan("MyName");

      expect(zipkinTracer.scoped).toHaveBeenCalled();
      zipkinTracer.scoped.mock.calls[0][0]();

      expect(zipkin.Annotation.ClientSend).toHaveBeenCalled();
      expect(zipkinTracer.recordAnnotation).toHaveBeenCalledTimes(2);
    });

    describe("span object", () => {
      let span;
      beforeEach(() => {
        span = tracer.startSpan("Ponyfoo");

        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();
        zipkinTracer.scoped.mockReset();
        zipkinTracer.recordAnnotation.mockReset();
      });

      it("should expose spanId", () => {
        expect(span.id).toBeDefined();

        // Test if mock is sufficient
        expect(span.id.traceId).toBeDefined();
        expect(span.id.parentId).toBeDefined();
        expect(span.id.spanId).toBeDefined();
        expect(span.id.sampled).toBeDefined();
      });

      it("should expose its context", () => {
        const spanContext = span.context();
        expect(spanContext.toSpanId()).toBe(span.id.spanId);
        expect(spanContext.toTraceId()).toBe(span.id.traceId);
      });

      it("should log data", () => {
        span.log({ event: "data_received", data: "42" });

        // should do it in a scope
        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();

        expect(zipkinTracer.recordBinary).toHaveBeenCalledWith(
          "event",
          "data_received"
        );
        expect(zipkinTracer.recordBinary).toHaveBeenCalledWith("data", "42");
      });

      it("should use the right id in log", () => {
        const otherSpan = tracer.startSpan("Other Span", {
          kind: "client"
        });

        zipkinTracer.scoped.mockReset();
        zipkinTracer.setId.mockReset();
        span.log({ event: "other event" });

        // should do it in a scope
        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();
        expect(zipkinTracer.setId).toHaveBeenLastCalledWith(span.id);
        zipkinTracer.scoped.mockReset();
        zipkinTracer.setId.mockReset();

        otherSpan.log({ event: "yet another event" });
        // should do it in a scope
        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();
        expect(zipkinTracer.setId).toHaveBeenLastCalledWith(otherSpan.id);
      });

      it("should not fail without an argument", () => {
        expect(() => {
          span.log();
          // should do it in a scope
          expect(zipkinTracer.scoped).toHaveBeenCalled();
          zipkinTracer.scoped.mock.calls[0][0]();
        }).not.toThrowError();
      });

      it("should finish a span", () => {
        span.finish();

        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();

        expect(zipkinTracer.setId).toHaveBeenCalled();
      });

      it("should send a server send annotation on finish if tracer is of kind server", () => {
        // Start a tracer
        tracer = new Tracer({
          serviceName: "MyService",
          recorder: {},
          kind: "server"
        });
        zipkinTracer = tracer._zipkinTracer;
        zipkinTracer.scoped.mockReset();

        // Start a span
        span = tracer.startSpan("Ponyfoo");

        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();
        zipkinTracer.scoped.mockReset();
        zipkinTracer.recordAnnotation.mockReset();

        span.finish();

        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();

        expect(zipkin.Annotation.ServerSend).toHaveBeenCalled();
        expect(zipkinTracer.recordAnnotation).toHaveBeenCalledTimes(1);
      });

      it("should send a client receive annotation on finish if tracer is of kind client", () => {
        // Start a tracer
        tracer = new Tracer({
          serviceName: "MyService",
          recorder: {},
          kind: "client"
        });
        zipkinTracer = tracer._zipkinTracer;
        zipkinTracer.scoped.mockReset();

        // Start a span
        span = tracer.startSpan("Ponyfoo");

        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();
        zipkinTracer.scoped.mockReset();
        zipkinTracer.recordAnnotation.mockReset();

        span.finish();

        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();

        expect(zipkin.Annotation.ClientRecv).toHaveBeenCalled();
        expect(zipkinTracer.recordAnnotation).toHaveBeenCalledTimes(1);
      });

      it("should use the right id in finish", () => {
        const otherSpan = tracer.startSpan("Other Span", {
          kind: "server"
        });

        zipkinTracer.scoped.mockReset();
        zipkinTracer.setId.mockReset();
        span.finish();

        // should do it in a scope
        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();
        expect(zipkinTracer.setId).toHaveBeenLastCalledWith(span.id);
        zipkinTracer.scoped.mockReset();
        zipkinTracer.setId.mockReset();

        otherSpan.finish();
        // should do it in a scope
        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();
        expect(zipkinTracer.setId).toHaveBeenLastCalledWith(otherSpan.id);
      });

      // TODO: supported tags: https://github.com/opentracing/specification/blob/master/semantic_conventions.md#span-tags-table
      //       We might need to extend them in the future

      it("should set tag with an ip address", () => {
        span.setTag("peer.address", "128.167.178.4:5678");

        // should do it in a scope
        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();

        expect(zipkin.Annotation.ServerAddr).toHaveBeenLastCalledWith({
          serviceName: "MyService",
          host: new zipkin.InetAddress("128.167.178.4"),
          port: 5678
        });
        expect(zipkinTracer.recordAnnotation).toHaveBeenCalledTimes(1);
      });

      it("should set tag with an ip address with default port", () => {
        span.setTag("peer.address", "128.167.178.4");

        // should do it in a scope
        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();

        expect(zipkin.Annotation.ServerAddr).toHaveBeenLastCalledWith({
          serviceName: "MyService",
          host: new zipkin.InetAddress("128.167.178.4"),
          port: 80
        });
        expect(zipkinTracer.recordAnnotation).toHaveBeenCalledTimes(1);
      });

      it("should set arbitrary key/value tags", () => {
        span.setTag("ponies", 42);

        // should do it in a scope
        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();
        expect(zipkin.Annotation.BinaryAnnotation).toHaveBeenLastCalledWith(
          "ponies",
          42
        );
        expect(zipkinTracer.recordAnnotation).toHaveBeenCalledTimes(1);
      });

      it("should fail set tag if key has wrong type of value", () => {
        expect(() => {
          span.setTag("peer.address", 42);

          // should do it in a scope
          expect(zipkinTracer.scoped).toHaveBeenCalled();
          zipkinTracer.scoped.mock.calls[0][0]();
        }).toThrowErrorMatchingSnapshot();
      });

      it("should set tag for address on client", () => {
        // Set tracer
        tracer = new Tracer({
          serviceName: "MyService",
          recorder: {},
          kind: "client"
        });
        zipkinTracer = tracer._zipkinTracer;
        zipkinTracer.scoped.mockReset();

        // Set span
        span = tracer.startSpan("Ponyfoo");

        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();
        zipkinTracer.scoped.mockReset();
        zipkinTracer.recordAnnotation.mockReset();

        // Actual test
        span.setTag("peer.address", "128.167.178.4:5678");

        // should do it in a scope
        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();

        expect(zipkin.Annotation.ClientAddr).toHaveBeenLastCalledWith({
          serviceName: "MyService",
          host: new zipkin.InetAddress("128.167.178.4"),
          port: 5678
        });
        expect(zipkinTracer.recordAnnotation).toHaveBeenCalledTimes(1);
      });
    });

    it("should expose inject/extract formats", () => {
      expect(Tracer.FORMAT_TEXT_MAP).toBeDefined();
      expect(Tracer.FORMAT_HTTP_HEADERS).toBeDefined();
      expect(Tracer.FORMAT_BINARY).toBeDefined();
    });
  });

  describe("usage of sampler", () => {
    it("tracer should be initialize zipkin with a sampler");
    it("span should be aware of sampler");
    it("startSpan with parent should use parents sample value");
  });

  describe("usage of recorder", () => {
    it("should initialize zipkin with the recorder provided", () => {
      new Tracer({
        serviceName: "MyService",
        recorder: { id: 42 },
        kind: "server"
      });

      expect(zipkin.Tracer).toHaveBeenCalledWith({
        ctxImpl: {},
        recorder: { id: 42 },
        sampler: expect.any(Sampler)
      });
    });
  });

  describe("inject (serialize)", () => {
    let tracer;
    let zipkinTracer;
    beforeEach(() => {
      tracer = new Tracer({
        serviceName: "MyService",
        recorder: {},
        kind: "server"
      });
      zipkinTracer = tracer._zipkinTracer;
    });

    // not relevant for us
    describe("Text Map", () => {
      it("should throw an error, because it is unsupported", () => {
        const span = tracer.startSpan("Span");

        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();

        expect(() => {
          const carrier = {};
          tracer.inject(span, Tracer.FORMAT_TEXT_MAP, carrier);
        }).toThrowErrorMatchingSnapshot();
      });
    });

    describe("HTTP Headers", () => {
      it("should throw without a span", () => {
        expect(() => {
          const carrier = {};
          tracer.inject(undefined, Tracer.FORMAT_HTTP_HEADERS, carrier);
        }).toThrowErrorMatchingSnapshot();
      });

      it("should throw without a carrier", () => {
        const span = tracer.startSpan("Span");

        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();
        expect(() => {
          tracer.inject(span, Tracer.FORMAT_HTTP_HEADERS);
        }).toThrowErrorMatchingSnapshot();
      });

      it("should set headers", () => {
        const span = tracer.startSpan("Span");

        expect(zipkinTracer.scoped).toHaveBeenCalled();
        zipkinTracer.scoped.mock.calls[0][0]();

        const carrier = { couldBe: "anything request related" };
        tracer.inject(span, Tracer.FORMAT_HTTP_HEADERS, carrier);

        expect(carrier["x-b3-spanid"]).toBe(span.id.spanId);
      });
    });

    // not relevant for us
    describe("Binary", () => {
      it("should throw an error, because it is unsupported", () => {
        const span = tracer.startSpan("Span");
        expect(() => {
          const carrier = {};
          tracer.inject(span, Tracer.FORMAT_BINARY, carrier);
        }).toThrowErrorMatchingSnapshot();
      });
    });
  });

  describe("extract (deserialize)", () => {
    let tracer;
    let zipkinTracer;
    beforeEach(() => {
      tracer = new Tracer({
        serviceName: "MyService",
        recorder: {},
        kind: "client"
      });
      zipkinTracer = tracer._zipkinTracer;
    });

    // not relevant for us
    describe("Text Map", () => {
      it("should throw an error, because it is unsupported", () => {
        expect(() => {
          const carrier = {};
          tracer.extract(Tracer.FORMAT_TEXT_MAP, carrier);
        }).toThrowErrorMatchingSnapshot();
      });
    });

    describe("HTTP Headers", () => {
      it("should fail with an invalid carrier", () => {
        expect(() => {
          tracer.extract(Tracer.FORMAT_HTTP_HEADERS, true);
        }).toThrowErrorMatchingSnapshot();
      });

      it("should return null without http headers", () => {
        expect(() => {
          const span = tracer.extract(Tracer.FORMAT_HTTP_HEADERS, {});
          expect(span).toBe(null);
        }).not.toThrowError();
      });

      it("should handle child spans correctly", () => {
        const httpHeaders = {
          "x-b3-traceid": "myTraceId",
          "x-b3-spanid": "mySpanId",
          "x-b3-sampled": "1"
        };
        const span = tracer.extract(Tracer.FORMAT_HTTP_HEADERS, httpHeaders);
        expect(zipkinTracer.scoped).not.toHaveBeenCalled();
        expect(zipkinTracer.recordAnnotation).not.toHaveBeenCalled();
        expect(zipkinTracer.recordServiceName).not.toHaveBeenCalled();

        expect(span.id.traceId.value).toBe("myTraceId");
        expect(span.id.spanId).toBe("mySpanId");
        expect(span.id.sampled.value).toBe("1");
        expect(span.log).toBeInstanceOf(Function);
        expect(span.finish).toBeInstanceOf(Function);
      });

      it("should handle parent spans correctly", () => {
        const httpHeaders = {
          "x-b3-traceid": "myTraceId",
          "x-b3-spanid": "mySpanId",
          "x-b3-parentspanid": "myParentSpanId",
          "x-b3-sampled": "1"
        };
        const span = tracer.extract(Tracer.FORMAT_HTTP_HEADERS, httpHeaders);
        expect(zipkinTracer.scoped).not.toHaveBeenCalled();
        expect(zipkinTracer.recordAnnotation).not.toHaveBeenCalled();
        expect(zipkinTracer.recordServiceName).not.toHaveBeenCalled();

        expect(span.id.traceId.value).toBe("myTraceId");
        expect(span.id.spanId).toBe("mySpanId");
        expect(span.id.parentId.value).toBe("myParentSpanId");
        expect(span.id.sampled.value).toBe("1");
        expect(span.log).toBeInstanceOf(Function);
        expect(span.finish).toBeInstanceOf(Function);
      });
    });

    // not relevant for us
    describe("Binary", () => {
      expect(() => {
        const carrier = {};
        tracer.extract(Tracer.FORMAT_BINARY, carrier);
      }).toThrowErrorMatchingSnapshot();
    });
  });

  describe("helpers", () => {
    describe("makeOptional", () => {
      let makeOptional;
      beforeEach(() => {
        makeOptional = Tracer.makeOptional;
      });

      it("should return none if null is given", () => {
        expect(makeOptional(null).toString()).toBe("None");
      });

      it("should return some if something is given", () => {
        expect(makeOptional(3).toString()).toBe("Some(3)");
      });

      it("should not fail on double call", () => {
        expect(makeOptional(makeOptional(3)).toString()).toBe("Some(3)");
      });
    });
  });
});
