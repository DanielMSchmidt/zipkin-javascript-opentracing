// require("babel-polyfill");
import fetch from "node-fetch";
import { getLastTrace } from "../utils";

describe("Log", () => {
  beforeEach(() => {});

  it("should be able to get the right span name", async () => {
    cy.visit("/");
    cy.get("#Log").click();
    cy.get("#LogButton").click();
    const trace = await getLastTrace();
    expect(trace.name).to.equal("firstspan");
    expect(JSON.stringify(trace)).to.eql("FO");
  });
});
