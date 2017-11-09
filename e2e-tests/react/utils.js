import fetch from "node-fetch";
const log = window.console;

export function getContent(page, selector) {
  log.info("utils.getContent", "query selector:", selector);
  return page.evaluate(
    selector => document.querySelector(selector).textContent,
    selector
  );
}

export function getSpan(serviceName, spanName) {
  return new Promise(async (resolve, reject) => {
    log.info(
      "utils.getSpan",
      "serviceName/spanName => ",
      serviceName,
      "/",
      spanName
    );
    const traceResult = await fetch(
      "http://localhost:9411/api/v1/traces?serviceName=" + serviceName
    ).then(res => res.json());
    log.info("utils.getSpan", "traceResult => ", traceResult);
    if (!traceResult.length) {
      return reject("Empty result set");
    }

    const traceList = traceResult[0];
    if (!traceList.length) {
      return reject("Empty traceList set");
    }
    log.info("utils.getSpan", "traceResult => ", traceList);

    // Filter for right name, we assume there is only one
    const trace = traceList.filter(({ name }) => name === spanName)[0];
    log.info("utils.getSpan", "extracted trace => ", trace);
    resolve(trace);
  });
}
