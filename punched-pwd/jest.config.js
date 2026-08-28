/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  // Next's tsconfig sets jsx:"preserve" (kept for the app router); Jest needs
  // the JSX compiled, so override jsx for the ts-jest transform only.
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
};
