const ts = require('@rollup/plugin-typescript');
const dts = require('rollup-plugin-dts').default;
const pkg = require('./package.json');
const eslint = require('@rollup/plugin-eslint');

module.exports = [
    {
        input: './src/index.ts',
        output: [
            {
                format: 'es',
                file: pkg.module,
                sourcemap: true,
            },
            {
                name: pkg.name,
                format: 'umd',
                file: pkg.main.replace(/\.common\.js$/, '.umd.js'),
                sourcemap: true,
            },
            {
                format: 'commonjs',
                file: pkg.main,
                sourcemap: true,
            },
            {
                name: 'o',
                banner: '(function (){\n',
                footer: 'Object.assign(globalThis, o);\n})();',
                format: 'iife',
                extend: false,
                file: pkg.main.replace(/\.common\.js$/, '.iife.js'),
                sourcemap: true,
            },
        ],
        plugins: [ts()],
    },
    {
        input: './src/index.ts',
        output: [
            {
                file: pkg.types,
            },
        ],
        plugins: [
            dts(),
            eslint({
                fix: false,
                throwOnError: true,
                throwOnWarning: false,
            }),
        ],
    },
];
