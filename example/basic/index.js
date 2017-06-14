const express = require('express');
const ZipkinJavascriptOpentracing = require('../../index');

const { recorder } = require('../recorder');

const app = express();
const tracer = new ZipkinJavascriptOpentracing({
    serviceName: 'My Service',
    recorder,
    kind: 'client',
});

app.use(function zipkinExpressMiddleware(req, res, next) {
    const span = tracer.startSpan('My Span');

    setTimeout(() => {
        span.log({
            statusCode: '200',
            objectId: '42',
        });
    }, 100);

    setTimeout(() => {
        span.finish();
    }, 200);

    next();
});

app.get('/', (req, res) => res.send(Date.now().toString()));

app.listen(8081, () => {
    console.log('Frontend listening on port 8081!');
});
