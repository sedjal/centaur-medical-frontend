module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/unit/**/*.(spec|test).[jt]s?(x)'],
  moduleFileExtensions: ['js', 'ts', 'tsx', 'json'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!(@vue|vue|vue-router|pinia)/)'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/tests/unit/styleMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/utils/**/*.{ts,tsx}',
    'src/stores/auth.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      lines: 70,
      functions: 70,
      branches: 40,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/unit/setup.ts'],
};
