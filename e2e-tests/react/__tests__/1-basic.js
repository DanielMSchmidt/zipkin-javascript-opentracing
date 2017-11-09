import puppeteer from "puppeteer";
import { getSpan, getContent, waitForSpan } from "../utils";

describe("Basic: Spans", () => {
  let browser, page;
  beforeAll(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  beforeEach(async () => {
    await page.goto("http://localhost:3000");
    await page.click("#Basic");
  });

  afterAll(async () => {
    await browser.close();
  });

  it("only starting one should not add a new span");
  it("starting and finishing a span should register one in the server", async () => {
    const before = await getContent(page, "#buttonLabel");
    expect(before).toBe("Not-Pressed");

    await page.type("#spanNameInput", "basicspan1", { delay: 100 });
    await page.click("#basicButton");

    await waitForSpan("basicservice", "basicspan1");
  });

  it("span should have a name");
  it("span should have a service set");
});
