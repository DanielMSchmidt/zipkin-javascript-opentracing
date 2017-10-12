# Changelog

## 1.1.0
- [PR#10](https://github.com/costacruise/zipkin-javascript-opentracing/pull/10) adding support for a more simplified setup:

```js
const ZipkinOpentracing = require("zipkin-javascript-opentracing");

const tracer = new ZipkinOpentracing({
    serviceName: 'My Service',
    endpoint: "http://localhost:9411",
    kind: 'client',
});
```

## 1.0.0

- [PR#9](https://github.com/costacruise/zipkin-javascript-opentracing/pull/9) moving dev dependencies up to peer dependencies, breaking change for clients using older versions of `opentracing`, `zipkin` or `zipkin-transport-http`