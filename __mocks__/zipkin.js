const None = {
  get type() {
    return "None";
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
    return other.type === "None";
  },
  toString() {
    return "None";
  },
  get present() {
    return false;
  }
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
    return "Some";
  }
}

class InetAddress {
  constructor(addr) {
    this.addr = addr;
  }
  toInt() {
    // e.g. 10.57.50.83
    // should become
    // 171520595
    const parts = this.addr.split(".");

    // The jshint tool always complains about using bitwise operators,
    // but in this case it's actually intentional, so we disable the warning:
    // jshint bitwise: false
    return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
  }
  toString() {
    return `InetAddress(${this.addr})`;
  }
}

module.exports = {
  Annotation: {
    BinaryAnnotation: jest.fn(),
    ClientAddr: jest.fn(),
    ClientRecv: jest.fn(),
    ClientSend: jest.fn(),
    ServerAddr: jest.fn(),
    ServerRecv: jest.fn(),
    ServerSend: jest.fn(),
    Rpc: jest.fn()
  },
  InetAddress,
  ExplicitContext: jest.fn(),
  Tracer: jest.fn(() => ({
    createRootId: jest.fn(() => {
      return {
        traceId: new Some("traceId:" + new Date() + Math.random()),
        parentId: new Some("parentId:" + new Date() + Math.random()),
        spanId: "spanId:" + new Date() + Math.random(),
        sampled: new Some("sampled:" + new Date() + Math.random())
      };
    }),
    recordAnnotation: jest.fn(),
    recordBinary: jest.fn(),
    recordServiceName: jest.fn(),
    scoped: jest.fn(cb => process.nextTick(cb)),
    setId: jest.fn()
  })),
  TraceId: jest.fn(traceId => Object.assign({}, traceId)),
  Request: {
    addZipkinHeaders: jest.fn((_, base) => ({
      headers: {
        "X-B3-TraceId": base.traceId,
        "X-B3-SpanId": base.spanId,
        "X-B3-Sampled": base.sampled
      }
    }))
  },
  HttpHeaders: {
    TraceId: "X-B3-TraceId",
    SpanId: "X-B3-SpanId",
    ParentSpanId: "X-B3-ParentSpanId",
    Sampled: "X-B3-Sampled",
    Flags: "X-B3-Flags"
  },
  option: require("zipkin-option"),
  sampler: {
    alwaysSample: jest.fn(() => true),
    Sampler: jest.fn()
  },
  jsonEncoder: {
    JSON_V1: jest.fn()
  }
};
