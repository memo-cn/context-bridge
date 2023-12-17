// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable */
const path = require('path');
const fs = require('fs');
const wd = __dirname;
const from = path.resolve(wd, '../CHANGELOG.md');

// 创建 Change Log 的链接
link(from, path.resolve(wd, '../docs/zh-CN/CHANGELOG.md'));
link(from, path.resolve(wd, '../docs/en-US/CHANGELOG.md'));

function link(from, to) {
    if (fs.existsSync(to)) {
        const stat = fs.statSync(to);
        if (stat.isSymbolicLink()) {
            fs.unlinkSync(to);
        } else {
            console.error('无法创建链接到:', to);
            return;
        }
    }
    fs.symlinkSync(from, to);
}
