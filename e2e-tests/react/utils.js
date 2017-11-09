import log from "npmlog";

export function getContent(page, selector) {
  log.info("utils", "query selector: %s", selector);
  return page.evaluate(
    selector => document.querySelector(selector).textContent,
    selector
  );
}
