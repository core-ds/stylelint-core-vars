const IGNORED_PACKAGES = ['@manypkg/find-root', '@manypkg/get-packages', '@manypkg/tools'];

/**
 * @type {import('jest').Config}
 */
const config = {
    preset: 'jest-preset-stylelint',
    setupFiles: ['<rootDir>/jest.setup.js'],
    transformIgnorePatterns: [`/node_modules/(?!(${IGNORED_PACKAGES.join('|')})/)`],
};

export default config;
