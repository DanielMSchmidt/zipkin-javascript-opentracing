# Changelog

## 1.4.0

* Add support for local spans through workaround. Waiting for
  [zipkin-js#156](https://github.com/openzipkin/zipkin-js/pull/156) to be
  merged.

## 1.3.0

* Update of `peerDependencies`, so that zipkin v2 schema is supported
* Fix babel transpilation directory

## 1.2.0

Issues arised with [`react-scripts` throwing an error that this library is not
transpiled](https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md#npm-run-build-fails-to-minify).
To fix it we introduced babel and now ship with a transpiled `lib/` folder

## 1.1.0

* [PR#10](https://github.com/costacruise/zipkin-javascript-opentracing/pull/10)
  adding support for a more simplified setup:

```js
const ZipkinOpentracing = require("zipkin-javascript-opentracing");

const tracer = new ZipkinOpentracing({
  serviceName: "My Service",
  endpoint: "http://localhost:9411",
  kind: "client"
});
```

## 1.0.0

* [PR#9](https://github.com/costacruise/zipkin-javascript-opentracing/pull/9)
  moving dev dependencies up to peer dependencies, breaking change for clients
  using older versions of `opentracing`, `zipkin` or `zipkin-transport-http`
