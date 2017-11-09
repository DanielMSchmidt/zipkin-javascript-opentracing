require("babel-polyfill");
import fetch from "node-fetch";

const getTraceAmount = () =>
  fetch("http://localhost:9411/api/v2/traces")
    .then(res => res.json())
    .then(res => res.length);

const getLastTrace = () =>
  new Promise((resolve, reject) =>
    fetch("http://localhost:9411/api/v2/traces")
      .then(res => res.json())
      .then(res => (res.length ? resolve(res[res.length - 1]) : resolve(null)))
  );

const getLastTraceWithName = async name => {
  const trace = await getLastTrace();
  if (trace !== null && trace.length && trace[0].name === name) {
    return trace;
  }
  return getLastTraceWithName(name);
};

const wait = (time = 2000) => new Promise(resolve => setTimeout(resolve, time));

describe("Basic", () => {
  describe("Setup", () => {
    it("should be able to access zipkin", async () => {
      const response = await fetch("http://localhost:9411/api/v2/traces");
      expect(response.status).to.equal(200);
    });
  });

  describe("Span", () => {
    it("should be able interact with the basic example", async () => {
      const before = await getTraceAmount();
      cy.visit("/");
      cy.get("#Basic").click();
      cy.get("#buttonLabel").should($p => {
        expect($p.first()).to.contain("Not-Pressed");
      });
      cy.get("#basicButton").click();
      cy.get("#buttonLabel").should(async $p => {
        expect($p.first()).to.contain("Is-Pressed");
        const after = await getTraceAmount();
        expect(after - before).to.equal(1);
      });
    });

    it("should be able to get the right span name", async () => {
      const spanName = "secondtest" + +new Date();
      cy.visit("/");
      cy.get("#Basic").click();
      cy.get("#buttonLabel").should($p => {
        expect($p.first()).to.contain("Not-Pressed");
      });
      cy.get("#spanNameInput").type(spanName);
      cy.get("#basicButton").click();

      cy.get("#buttonLabel").should(async $p => {
        expect($p.first()).to.contain("Is-Pressed");
        const trace = await getLastTraceWithName(spanName);
        expect(trace.name).to.equal(spanName);
        expect(JSON.stringify(trace)).to.equal("asdas");
      });
    });
  });
});
