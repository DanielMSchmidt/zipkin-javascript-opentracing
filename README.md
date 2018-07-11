# Zipkin-Javascript-Opentracing [![Build Status](https://travis-ci.org/DanielMSchmidt/zipkin-javascript-opentracing.svg?branch=master)](https://travis-ci.org/DanielMSchmidt/zipkin-javascript-opentracing) [![Coverage Status](https://coveralls.io/repos/github/DanielMSchmidt/zipkin-javascript-opentracing/badge.svg?branch=master)](https://coveralls.io/github/DanielMSchmidt/zipkin-javascript-opentracing?branch=master)

## Installation

Run `npm install --save zipkin-javascript-opentracing` to install the library.

For usage instructions, please see the examples in the [`examples/`](examples/)
directory. There is a [basic vanilly
javascript](https://github.com/DanielMSchmidt/zipkin-javascript-opentracing/tree/master/examples/vanillajs/basic)
example that shows how to use the tracer in the context of a single express
server and there is an [advanced vanilla
javascript](https://github.com/DanielMSchmidt/zipkin-javascript-opentracing/tree/master/examples/vanillajs/advanced)
example that shows how multiple services (express API and frontend) might
interact and share a tracing context.

## Limitations

### injecting and ejecting

We currently only support HTTP Headers. If you need your own mechanism, feel
free to do a PR. Also we assume that you only inject the HTTP Headers once,
otherwise we will send multiple `ClientSend` annotations for you.

Also you can only finish spans which were not extracted. If you like this
behaviour to be different, please open an issue.

### Flags

They are currently not supported, feel free to do a PR.

### Follows From (zipkin)

FollowsFrom is not supported by openTracing, as far as I understand.

### Additional options for starting a span

We need to know if this is a server or client to set the right annotations.
Therefore we need the kind attribute to be set.

## Example

All examples need to run zipkin on `"localhost:9411"`. This is best achieved by
using docker:

```bash
docker run -d -p 9411:9411 openzipkin/zipkin
```

### Basic

To see how to use this library with only one service see
`examples/vanillajs/basic`. You can run the example with `npm run example:basic`.

### Advanced

In order to see how different services may pick up spans and extend them, please
see the advanced example at `examples/vaniallajs/advanced`. You can run the
example with `npm run example:advanced`.
