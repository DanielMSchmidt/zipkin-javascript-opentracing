import fetch from "node-fetch";
import puppeteer from "puppeteer";
import { getContent } from "../utils";

describe("Setup", () => {
  let browser, page;
  beforeAll(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  it("should be able to access zipkin", async () => {
    const response = await fetch("http://localhost:9411/api/v2/traces");
    expect(response.status).toBe(200);
  });

  it("should reach the demo page", async () => {
    await page.goto("http://localhost:3000");
    await page.click("#Basic");

    const before = await getContent(page, "#buttonLabel");
    expect(before).toBe("Not-Pressed");

    await page.click("#basicButton");

    const after = await getContent(page, "#buttonLabel");
    expect(after).toBe("Is-Pressed");

    await browser.close();
  });
});
