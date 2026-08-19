import "@testing-library/jest-dom";

// react-hot-toast renders nothing meaningful under jsdom and its default export
// pulls in DOM-only helpers; stub it so unit tests can spy on toast calls.
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    custom: jest.fn(),
  },
}));
