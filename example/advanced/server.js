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

  const expected = ["x-b3-traceid", "x-b3-spanid", "x-b3-sampled"];
  const actual = [];
  Object.keys(req.headers).map(
    header => expected.indexOf(header) > -1 && actual.push(header)
  );

  const headersMeetExpectation = arraysEqual(expected, actual);
  console.log(`Headers are as expected: ${headersMeetExpectation}\n`, {
    actual,
    expected
  });

  setTimeout(() => {
    span.log({
      statusCode: "200",
      objectId: "42"
    });
  }, 100);

  setTimeout(() => {
    span.finish();
  }, 200);

  next();
});

app.get("/", (req, res) => {
  res.send(Date.now().toString());
});

app.listen(8082, () => {
  console.log("Frontend listening on port 8082!");
});

function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  for (var i = arr1.length; i--; ) {
    if (arr1[i] !== arr2[i]) return false;
  }

  return true;
}
