import React, { Component } from "react";
const ZipkinJavascriptOpentracing = require("zipkin-javascript-opentracing");
const { BatchRecorder } = require("zipkin");
const { HttpLogger } = require("zipkin-transport-http");

const tracer = new ZipkinJavascriptOpentracing({
  serviceName: "basic",
  recorder: new BatchRecorder({
    logger: new HttpLogger({
      endpoint: "http://localhost:9411/api/v2/spans"
    })
  }),
  kind: "client"
});

export default class BasicScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pressed: false,
      spanName: ""
    };
  }

  render() {
    return (
      <div style={{ flex: 1, paddingTop: 40, justifyContent: "flex-start" }}>
        <a
          id="basicButton"
          onClick={() => {
            const span = tracer.startSpan(this.state.spanName);
            this.setState({ pressed: true });
            span.finish();
          }}
        >
          <span id="buttonLabel">
            {this.state.pressed ? "Is-Pressed" : "Not-Pressed"}
          </span>
          <input
            id="spanNameInput"
            onChange={event =>
              this.setState({
                spanName: event.target.value
              })
            }
            value={this.state.spanName}
          />
        </a>
      </div>
    );
  }
}
