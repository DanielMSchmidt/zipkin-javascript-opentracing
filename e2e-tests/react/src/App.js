import React, { Component } from "react";
import "./App.css";
import { Basic, Log } from "./screens";

class App extends Component {
  state = {
    screen: false
  };

  renderScreenButton(title, component) {
    return (
      <a
        id={title}
        onClick={() => {
          this.setState({ screen: component });
        }}
      >
        <span style={{ color: "blue", marginBottom: 20 }}>{title}</span>
      </a>
    );
  }

  render() {
    if (!this.state.screen) {
      return (
        <ul>
          <li className="App">{this.renderScreenButton("Basic", Basic)}</li>
          <li className="App">{this.renderScreenButton("Log", Log)}</li>
        </ul>
      );
    }

    const Screen = this.state.screen;
    return <Screen />;
  }
}

export default App;
