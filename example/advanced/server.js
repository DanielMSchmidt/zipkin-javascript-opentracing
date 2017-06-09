const express = require("express");
const ZipkinJavascriptOpentracing = require("../../index");
const { recorder } = require("../recorder");

const app = express();

app.use(function zipkinExpressMiddleware(req, res, next) {
  const tracer = new ZipkinJavascriptOpentracing({
    serviceName: "My Server",
    recorder
  });

  const span = tracer.extract(
    ZipkinJavascriptOpentracing.FORMAT_HTTP_HEADERS,
    req.headers
  );

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

app.listen(8082, () => {
  console.log('Frontend listening on port 8082!');
});
