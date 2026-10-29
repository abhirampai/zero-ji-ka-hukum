module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^.+\\.css$': '<rootDir>/test/style-mock.js',
    '^react$': '<rootDir>/node_modules/react',
    '^react/(.*)$': '<rootDir>/node_modules/react/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
  testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/'],
};
