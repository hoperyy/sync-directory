module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es2021: true,
        mocha: true,
    },
    extends: [
        'standard',
        'plugin:mocha/recommended',
    ],
    parserOptions: {
        ecmaVersion: 12,
    },
    rules: {
        indent: ['error', 4, { SwitchCase: 1 }],
        quotes: ['error', 'single'],
        semi: ['error', 'always'],
        'comma-dangle': ['error', 'only-multiline', { functions: 'never' }],
        'space-before-function-paren': ['error', {
            anonymous: 'always',
            named: 'never',
            asyncArrow: 'always'
        }],
        'node/no-callback-literal': 'off',
    },
    plugins: [
        'mocha',
    ]
};
