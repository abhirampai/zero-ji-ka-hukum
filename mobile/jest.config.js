module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^.+\\.css$': '<rootDir>/test/style-mock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
  testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/'],
};
