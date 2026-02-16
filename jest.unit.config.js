export default {
  testEnvironment: 'node',
  preset: 'ts-jest/presets/default-esm',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', useESM: true }],
    '^.+\\.vue$': ['@vue/vue3-jest']
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'vue'],
  moduleNameMapper: {
    "^.+\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  testMatch: ['<rootDir>/test/unit/**/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts']
  ,
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/stores/**/*.ts',
    'src/repositories/**/*.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 60,
      lines: 60,
      statements: 60
    }
  }
};
