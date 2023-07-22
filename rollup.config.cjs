const ts = require('@rollup/plugin-typescript');
const dts = require('rollup-plugin-dts').default;
const pkg = require('./package.json');
const eslint = require('@rollup/plugin-eslint');
const babel = require('@rollup/plugin-babel');
const terser = require('@rollup/plugin-terser');

const babelOutputPlugin = babel.getBabelOutputPlugin(require('./babel.config.json'));
const terserPlugin = new terser({});

module.exports = [
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
    {
        plugins: [ts()],
        input: './src/index.ts',
        output: [
            {
                format: 'es',
                file: pkg.module,
                sourcemap: true,
                plugins: [babelOutputPlugin, terserPlugin],
            },
            {
                format: 'commonjs',
                file: pkg.main,
                sourcemap: true,
                plugins: [babelOutputPlugin, terserPlugin],
            },
            {
                name: pkg.name,
                format: 'umd',
                file: pkg.main.replace(/\.common\.js$/, '.umd.js'),
                sourcemap: true,
                plugins: [terserPlugin],
            },
            {
                name: 'o',
                banner: '(function (){\n',
                footer: 'Object.assign(globalThis, o);\n})();',
                format: 'iife',
                extend: false,
                file: pkg.main.replace(/\.common\.js$/, '.iife.js'),
                sourcemap: true,
                plugins: [terserPlugin],
            },
        ],
    },
];
