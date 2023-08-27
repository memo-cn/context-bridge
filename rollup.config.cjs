const babel = require('@rollup/plugin-babel');
const commonjs = require('@rollup/plugin-commonjs');
const dts = require('rollup-plugin-dts').default;
const eslint = require('@rollup/plugin-eslint');
const json = require('@rollup/plugin-json');
const nodeResolve = require('@rollup/plugin-node-resolve');
const replace = require('@rollup/plugin-replace');
const terser = require('@rollup/plugin-terser');
const ts = require('rollup-plugin-typescript2');

const plugins = {
    babel: babel.getBabelOutputPlugin(require('./babel.config.json')),
    commonjs: commonjs(),
    dts: dts(),
    eslint: eslint({
        fix: false,
        throwOnError: true,
        throwOnWarning: false,
    }),
    json: json(),
    nodeResolve: nodeResolve(),
    replace: replace({
        preventAssignment: true,
        values: {},
    }),
    terser: new terser({
        sourceMap: true,
    }),
    ts: ts(),
};

const pkg = require('./package.json');

const isProd = process.env.NODE_ENV !== 'development';

// 仅在测试阶段生成 sourcemap 。
const sourcemap = !isProd;

const rollupOptions = [
    /** 声明文件 */
    {
        input: './src/index.ts',
        output: [
            {
                file: pkg.types,
            },
        ],
        plugins: [plugins.dts, plugins.eslint, plugins.nodeResolve, plugins.json, plugins.commonjs],
    },
    {
        plugins: [ts(), plugins.replace, plugins.eslint, plugins.nodeResolve, plugins.json, plugins.commonjs],
        input: './src/index.ts',
        output: [
            {
                format: 'es',
                file: pkg.module,
                sourcemap,
                plugins: isProd ? [plugins.terser, plugins.babel] : [],
            },
            isProd && {
                format: 'commonjs',
                file: pkg.main,
                sourcemap,
                plugins: [plugins.terser, plugins.babel],
            },
            isProd && {
                name: pkg.name,
                format: 'umd',
                file: pkg.main.replace(/\.common\.js$/, '.umd.js'),
                sourcemap,
                plugins: [plugins.terser],
            },
            isProd && {
                name: 'o',
                banner: '(function (){\n',
                footer: 'Object.assign(globalThis, o);\n})();',
                format: 'iife',
                extend: false,
                file: pkg.main.replace(/\.common\.js$/, '.iife.js'),
                sourcemap,
                plugins: [plugins.terser],
            },
        ].filter((e) => e),
    },
].filter((e) => e);

module.exports = function ({ watch, config } = {}) {
    return rollupOptions;
};
