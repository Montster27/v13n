import '@testing-library/jest-dom';

// Mock window.crypto for tests
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => Math.random().toString(36).substring(2) + Date.now().toString(36),
  },
});