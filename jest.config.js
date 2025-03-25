module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/__tests__/setup/setupJest.js'],
  moduleDirectories: ['node_modules', 'src'],
  moduleNameMapper: {
    '\\.svg': '<rootDir>/__tests__/mocks/svgMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-vector-icons)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
  ],
};
