import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';
import eslint from '@rollup/plugin-eslint';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import ts from 'rollup-plugin-typescript2';
import { defineConfig, RollupOptions } from 'rollup';
import pkg from './package.json' assert { type: 'json' };

const plugins = {
    babel: babel({
        minified: true,
        comments: false,
        sourceMaps: true,
        presets: [
            [
                '@babel/preset-env',
                {
                    shippedProposals: true,
                },
            ],
        ],
    }),
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
    terser: terser({
        sourceMap: true,
    }),
    ts: ts(),
};

const isProd = process.env.NODE_ENV !== 'development';

// 仅在测试阶段生成 sourcemap 。
const sourcemap = !isProd;

const rollupOptions: RollupOptions[] = [
    /** 声明文件 */
    {
        input: './src/index.ts',
        output: [
            {
                file: pkg.types,
            },
        ],
        plugins: [plugins.dts, plugins.eslint, plugins.nodeResolve, plugins.json, plugins.commonjs],
    } as RollupOptions,
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
                file: pkg.main.replace(/\.common\.c?js$/, '.umd.js'),
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
    } as RollupOptions,
].filter((e) => e);

export default defineConfig(function (commandLineArguments) {
    if (commandLineArguments.watch) {
    }
    return rollupOptions;
});
