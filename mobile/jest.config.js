module.exports = {
  preset: 'jest-expo',
  setupFiles: ['../node_modules/jest-expo/src/preset/setup.js', '<rootDir>/test/setup.js'],
  moduleNameMapper: {
    '^.+\\.css$': '<rootDir>/test/style-mock.js',
    '^react$': '<rootDir>/node_modules/react',
    '^react/(.*)$': '<rootDir>/node_modules/react/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@supersami))',
  ],
  moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
  testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/'],
};
