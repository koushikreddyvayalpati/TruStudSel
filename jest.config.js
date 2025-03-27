module.exports = {
  preset: 'react-native',
  setupFiles: [
    '<rootDir>/__tests__/setup/setupJest.js',
    '<rootDir>/__tests__/setup/setupTests.js'
  ],
  moduleDirectories: ['node_modules', 'src'],
  moduleNameMapper: {
    '\\.svg': '<rootDir>/__tests__/mocks/svgMock.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__tests__/mocks/fileMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-vector-icons|@react-navigation)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/mocks/',
    '/__tests__/setup/'
  ],
};
