const express = require('express');
const {
    BatchRecorder,
    Tracer,
    Annotation,
    ExplicitContext,
} = require('zipkin');
const { HttpLogger } = require('zipkin-transport-http');
const opentracing = require('opentracing');
const ZipkinJavascriptOpentracing = require('../index');

const recorder = new BatchRecorder({
    logger: new HttpLogger({
        endpoint: 'http://localhost:9411/api/v1/spans',
    }),
});

const app = express();

app.use(function zipkinExpressMiddleware(req, res, next) {
    const tracer = new ZipkinJavascriptOpentracing({
        serviceName: 'My Service',
        recorder: new BatchRecorder({
            logger: new HttpLogger({
                endpoint: 'http://localhost:9411/api/v1/spans',
            }),
        }),
    });

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

app.get('/', (req, res) => {
    res.send(Date.now().toString());
});

app.listen(8081, () => {
    console.log('Frontend listening on port 8081!');
});
