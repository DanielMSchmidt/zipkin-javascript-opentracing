const express = require("express");
const fetch = require("node-fetch");
const ZipkinJavascriptOpentracing = require("../../index");
const { recorder } = require("../recorder");

const app = express();

app.use(function zipkinExpressMiddleware(req, res, next) {
  const tracer = new ZipkinJavascriptOpentracing({
    serviceName: "My Client",
    recorder
  });

  const span = tracer.startSpan("My Client Span", { kind: "client" });

  setTimeout(() => {
    span.log({
      statusCode: "200",
      objectId: "42"
    });
  }, 100);

  const headers = {};
  tracer.inject(span, ZipkinJavascriptOpentracing.FORMAT_HTTP_HEADERS, headers);
  fetch("http://localhost:8082/", {
    headers: headers
  }).then(() => {
    span.finish();
    next();
  });
});

app.get("/", (req, res) => {
  res.send(Date.now().toString());
});

app.listen(8081, () => {
  console.log("Frontend listening on port 8081!");
});
