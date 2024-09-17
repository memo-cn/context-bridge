// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable */
const path = require('path');
const fs = require('fs');

// 创建 Change Log 的链接
link('../../CHANGELOG.md', path.resolve(__dirname, '../docs/zh-CN/CHANGELOG.md'));
link('../../CHANGELOG.md', path.resolve(__dirname, '../docs/en-US/CHANGELOG.md'));

function link(from, to) {
    try {
        fs.unlinkSync(to);
    } catch (e) {}
    fs.symlinkSync(from, to);
}
