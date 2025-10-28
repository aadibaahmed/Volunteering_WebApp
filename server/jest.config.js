// jest.config.js
export default {
  testEnvironment: "node",
  verbose: true,
  transform: {},
  collectCoverage: true,
  collectCoverageFrom: [
    "**/routes/**/*.js",
    "!**/routes/tests/**",
    "!**/node_modules/**",
  ],
  coverageDirectory: "coverage",
};
