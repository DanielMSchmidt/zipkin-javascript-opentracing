/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require("react");

const CompLibrary = require("../../core/CompLibrary.js");
const MarkdownBlock = CompLibrary.MarkdownBlock; /* Used to read markdown */
const Container = CompLibrary.Container;
const GridBlock = CompLibrary.GridBlock;

const siteConfig = require(process.cwd() + "/siteConfig.js");

class Button extends React.Component {
  render() {
    return (
      <div className="pluginWrapper buttonWrapper">
        <a className="button" href={this.props.href} target={this.props.target}>
          {this.props.children}
        </a>
      </div>
    );
  }
}

Button.defaultProps = {
  target: "_self"
};

class HomeSplash extends React.Component {
  render() {
    return (
      <div className="homeContainer">
        <div className="homeSplashFade">
          <div className="wrapper homeWrapper">
            <div className="projectLogo" />
            <div className="inner">
              <h2 className="projectTitle">
                {siteConfig.title}
                <small>{siteConfig.tagline}</small>
              </h2>
              <div className="section promoSection">
                <div className="promoRow">
                  <div className="pluginRowBlock">
                    <Button href="#try">Get Started</Button>
                    <Button href={siteConfig.baseUrl + "docs/examples.html"}>
                      See the examples
                    </Button>
                    <Button href="http://opentracing.io">
                      More about OpenTracing
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

class Index extends React.Component {
  render() {
    let language = this.props.language || "en";
    const showcase = siteConfig.users
      .filter(user => {
        return user.pinned;
      })
      .map(user => {
        return (
          <a href={user.infoLink}>
            <img src={user.image} title={user.caption} />
          </a>
        );
      });

    return (
      <div>
        <HomeSplash language={language} />
        <div className="mainContainer">
          <Container padding={["bottom", "top"]}>
            <GridBlock
              align="center"
              contents={[
                {
                  content: "Standard compatible implementation",
                  image: siteConfig.baseUrl + "img/opentracing.svg",
                  imageAlign: "top",
                  title: "OpenTracing"
                },
                {
                  content: "Use Zipkin to trace your application",
                  image: siteConfig.baseUrl + "img/openzipkin.jpg",
                  imageAlign: "top",
                  title: "Open Zipkin"
                }
              ]}
              layout="twoColumn"
            />
          </Container>

          <Container padding={["bottom", "top"]} id="try">
            <GridBlock
              contents={[
                {
                  content:
                    "You might want to look at the [examples](/docs/examples.html) to see how you can integrate it into your Javascript application.",
                  title: "Try it Out"
                },
                {
                  title: "Docs",
                  content:
                    "We are currently building up some useful docs, stay tuned. In the mean time, try to look at the examples, they might help you"
                }
              ]}
            />
          </Container>

          <div className="productShowcaseSection paddingBottom">
            <h2>{"Who's Using This?"}</h2>
            <p>This project is used by all these people</p>
            <div className="logos">{showcase}</div>
            <div className="more-users">
              Do you want your project to be listed, too? Send in an{" "}
              <a href="https://github.com/danielmschmidt/zipkin-javascript-opentracing">
                issue
              </a>.
            </div>
          </div>
        </div>
      </div>
    );
  }
}

module.exports = Index;
