export default {
  testEnvironment: "node",
  verbose: true,
  transform: {},
  collectCoverage: true,

  collectCoverageFrom: [
    "**/routes/**/*.js",
    "!**/routes/**/tests/**",
    "!**/routes/report.routes.js",
    "!**/node_modules/**"
  ],

  coverageDirectory: "coverage",
};
