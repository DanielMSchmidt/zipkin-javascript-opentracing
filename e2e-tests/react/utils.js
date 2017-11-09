import fetch from "node-fetch";
import log from "npmlog";
import { setTimeout } from "core-js/library/web/timers";

export function getContent(page, selector) {
  log.info("utils.getContent", "query selector: %s", selector);
  return page.evaluate(
    selector => document.querySelector(selector).textContent,
    selector
  );
}

export function getSpan(serviceName, spanName) {
  return new Promise(async (resolve, reject) => {
    log.info(
      "utils.getSpan",
      "serviceName/spanName => %s/%s",
      serviceName,
      spanName
    );
    const traceResult = await fetch(
      "http://localhost:9411/api/v1/traces?serviceName=" + serviceName
    ).then(res => res.json());
    log.info("utils.getSpan", "traceResult => %s", JSON.stringify(traceResult));
    if (!traceResult.length) {
      return reject("Empty result set");
    }

    const traceList = traceResult[0];
    if (!traceList.length) {
      return reject("Empty traceList set");
    }

    // Filter for right name, we assume there is only one
    const trace = traceList.filter(({ name }) => name === spanName)[0];
    log.info("utils.getSpan", "extracted trace => %s", JSON.stringify(trace));
    resolve(trace);
  });
}

export function waitForSpan(serviceName, spanName, timeout = 20000) {
  return Promise.race(
    (async function querySpan() {
      try {
        return await getSpan(serviceName, spanName);
      } catch (e) {
        return querySpan();
      }
    })(),
    new Promise(resolve => setTimeout(() => resolve(), timeout))
  );
}
