require("babel-polyfill");
import { getSpan } from "../../utils";

describe("Basic", () => {
  before(() => {
    cy.server();
    cy
      .route({
        url: "/api/v1/**",
        onRequest: xhr => {
          xhr.url = "http://localhost:9411" + xhr.url;
        }
      })
      .as("zipkinAPICall");
  });

  describe("Setup", () => {
    it("should be able to access zipkin", async () => {
      const response = await fetch("http://localhost:9411/api/v1/traces");
      expect(response.status).to.equal(200);
    });
  });

  describe("Span", () => {
    // it("should be able interact with the basic example", async () => {
    //   const before = await getTraceAmount();
    //   cy.visit("/");
    //   cy.get("#Basic").click();
    //   cy.get("#buttonLabel").should($p => {
    //     expect($p.first()).to.contain("Not-Pressed");
    //   });
    //   cy.get("#basicButton").click();
    //   cy.get("#buttonLabel").should(async $p => {
    //     expect($p.first()).to.contain("Is-Pressed");
    //   });
    //   const after = await getTraceAmount();
    //   expect(after - before).to.equal(1);
    // });

    it("should be able to get the right span name", async () => {
      const spanName = "span1-" + +new Date();
      cy.visit("/");
      cy.get("#Basic").click();
      cy.get("#buttonLabel").should($p => {
        expect($p.first()).to.contain("Not-Pressed");
      });
      cy.get("#spanNameInput").type(spanName);
      cy.get("#basicButton").click();

      cy.get("#buttonLabel").should(async $p => {
        expect($p.first()).to.contain("Is-Pressed");
      });

      cy.wait("@zipkinAPICall");
      const span = await getSpan("basicservice", spanName);
      expect(span.name).to.equal(spanName);
      expect(JSON.stringify(span)).to.equal("asdas");
    });
  });
});
