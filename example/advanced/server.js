const express = require('express');
const ZipkinJavascriptOpentracing = require('../../index');
const { recorder } = require('../recorder');

const app = express();
const tracer = new ZipkinJavascriptOpentracing({
    serviceName: 'My Server',
    recorder,
});

app.use(function zipkinExpressMiddleware(req, res, next) {
    const span = tracer.extract(
        ZipkinJavascriptOpentracing.FORMAT_HTTP_HEADERS,
        req.headers
    );

    const child = tracer.startSpan('Server has Child', {
        childOf: span,
        kind: 'server',
    });

    setTimeout(() => {
        span.log({
            serverVisited: 'yes',
        });

        child.log({
            result: '42',
        });
    }, 100);

    setTimeout(() => {
        console.log('finish server');
        child.finish();
        next();
    }, 200);
});

app.get('/', (req, res) => {
    res.send(Date.now().toString());
});

app.listen(8082, () => {
    console.log('Frontend listening on port 8082!');
});
