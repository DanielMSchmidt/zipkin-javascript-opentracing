/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* List of projects/orgs using your project for the users page */
const users = [
  {
    caption: "AIDA",
    image:
      "https://www.aida.de/typo3conf/ext/aid_distribution_aida/Resources/Public/v8/Images/AIDA-Logo.svg",
    infoLink: "https://www.aida.de",
    pinned: true
  }
];

const siteConfig = {
  title: "zipkin-javascript-opentracing" /* title for your website */,
  tagline: "Opentracing on the streets, Zipkin in the sheets",
  url: "https://danielmschmidt.github.io" /* your website url */,
  baseUrl: "/zipkin-javascript-opentracing/" /* base url for your project */,
  projectName: "zipkin-javascript-opentracing",
  headerLinks: [{ doc: "examples", label: "Examples" }],
  users,
  /* path to images for header/footer */
  headerIcon: "img/opentracing.svg",
  footerIcon: "img/opentracing.svg",
  favicon: "img/favicon.png",
  /* colors for website */
  colors: {
    primaryColor: "#68bfdb",
    secondaryColor: "#FFF"
  },
  // This copyright info is used in /core/Footer.js and blog rss/atom feeds.
  copyright: "Copyright © " + new Date().getFullYear() + " Daniel Schmidt",
  // organizationName: 'deltice', // or set an env variable ORGANIZATION_NAME
  // projectName: 'zipkin-javascript-opentracing', // or set an env variable PROJECT_NAME
  highlight: {
    // Highlight.js theme to use for syntax highlighting in code blocks
    theme: "default"
  },
  scripts: ["https://buttons.github.io/buttons.js"],
  // You may provide arbitrary config keys to be used as needed by your template.
  repoUrl: "https://github.com/danielmschmidt/zipkin-javascript-opentracing"
};

module.exports = siteConfig;
