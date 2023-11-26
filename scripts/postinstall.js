// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable */
const path = require('path');
const fs = require('fs');
const wd = __dirname;
const from = path.resolve(wd, '../CHANGELOG.md');

// 创建 Change Log 的链接
fs.symlinkSync(from, path.resolve(wd, '../docs/zh-CN/CHANGELOG.md'));
fs.symlinkSync(from, path.resolve(wd, '../docs/en-US/CHANGELOG.md'));
