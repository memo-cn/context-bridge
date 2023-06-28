module.exports = {
    env: {
        es2022: true,
        browser: false,
        node: false,
    },
    overrides: [
        {
            env: {
                node: true,
            },
            files: ['.eslintrc.{js,cjs}'],
            parserOptions: {
                sourceType: 'script',
            },
        },
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-plugin/recommended',
        'plugin:eslint-plugin-prettier/recommended',
        'eslint-config-prettier',
    ],
    plugins: ['@typescript-eslint', 'eslint-plugin-prettier'],
    rules: {
        'prettier/prettier': 'warn',
        '@typescript-eslint/no-explicit-any': 'off',
        'prefer-rest-params': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'prefer-const': 'off',
    },
};
