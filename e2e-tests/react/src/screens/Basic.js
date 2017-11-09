import React, { Component } from "react";
const ZipkinJavascriptOpentracing = require("../../../../");
const { BatchRecorder } = require("zipkin");
const { HttpLogger } = require("zipkin-transport-http");

const tracer = new ZipkinJavascriptOpentracing({
  serviceName: "BasicService",
  recorder: new BatchRecorder({
    logger: new HttpLogger({
      endpoint: "/api/v1/spans"
    })
  }),
  kind: "client"
});

export default class BasicScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pressed: false,
      spanName: "span"
    };
  }

  render() {
    return (
      <div style={{ flex: 1, paddingTop: 40, justifyContent: "flex-start" }}>
        <a
          id="basicButton"
          onClick={() => {
            const span = tracer.startSpan(this.state.spanName);
            console.log(this.state.spanName);
            this.setState({ pressed: true });
            span.finish();
          }}
        >
          <span id="buttonLabel">
            {this.state.pressed ? "Is-Pressed" : "Not-Pressed"}
          </span>
        </a>
        <input
          id="spanNameInput"
          onChange={event =>
            this.setState({
              spanName: event.target.value
            })
          }
          value={this.state.spanName}
        />
      </div>
    );
  }
}
