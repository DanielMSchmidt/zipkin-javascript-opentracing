const express = require('express');
const fetch = require('node-fetch');
const ZipkinJavascriptOpentracing = require('../../index');
const { recorder } = require('../recorder');

const app = express();
const tracer = new ZipkinJavascriptOpentracing({
    serviceName: 'My Client',
    recorder,
    kind: 'client',
});

app.use(function zipkinExpressMiddleware(req, res, next) {
    console.log('client middleware start');
    setTimeout(() => {
        const headers = {};
        const span = tracer.startSpan('Client Span');

        span.log({
            statusCode: '200',
            objectId: '42',
        });

        tracer.inject(
            span,
            ZipkinJavascriptOpentracing.FORMAT_HTTP_HEADERS,
            headers
        );

        const preRequestSpan = tracer.startSpan('Pre Request', {
            childOf: span,
        });

        setTimeout(() => {
            preRequestSpan.finish();

            fetch('http://localhost:8082/', {
                headers: headers,
            }).then(response => {
                const responseSpan = tracer.startSpan('Render Response', {
                    childOf: span,
                });

                responseSpan.log({
                    response: JSON.stringify(response),
                });

                setTimeout(() => {
                    responseSpan.finish();
                }, 100);

                setTimeout(() => {
                    span.finish();
                    next();
                }, 200);
            });
        }, 100);
    }, 100);
});

app.get('/', (req, res) => {
    res.send(Date.now().toString());
});

app.listen(8081, () => {
    console.log('Frontend listening on port 8081!');
});
