module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/**/__tests__/**', '!src/**/index.js'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'html', 'lcov'],
  testPathIgnorePatterns: ['/node_modules/', '/logs/'],
};
