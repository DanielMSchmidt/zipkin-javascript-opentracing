const express = require('express');
const ZipkinJavascriptOpentracing = require('../../index');
const { recorder } = require('../recorder');
const availableTags = require('opentracing').Tags;

const app = express();
const tracer = new ZipkinJavascriptOpentracing({
    serviceName: 'My Server',
    recorder,
    kind: 'server',
});

app.use(function zipkinExpressMiddleware(req, res, next) {
    console.log('server middleware start');
    const context = tracer.extract(
        ZipkinJavascriptOpentracing.FORMAT_HTTP_HEADERS,
        req.headers
    );

    const span = tracer.startSpan('Server Span', { childOf: context });

    span.setTag(availableTags.PEER_ADDRESS, '127.0.0.1:8082');

    setTimeout(() => {
        span.log({
            serverVisited: 'yes',
        });
    }, 100);

    setTimeout(() => {
        console.log('finish server');
        span.finish();
        next();
    }, 200);
});

app.get('/', (req, res) => {
    res.send(Date.now().toString());
});

app.listen(8082, () => {
    console.log('Frontend listening on port 8082!');
});
