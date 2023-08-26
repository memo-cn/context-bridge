import { defaultTheme, defineUserConfig } from 'vuepress';

export default defineUserConfig({
    base: '/context-bridge/',
    lang: 'zh-CN',
    title: '上下文桥',
    locales: {
        '/en-US/': {
            lang: 'en-US',
            title: 'Context Bridge',
            description:
                'Context Bridge is a mechanism that enables different JavaScript execution environments to invoke each other.',
        },
        '/zh-CN/': {
            lang: 'zh-CN',
            title: '上下文桥',
            description: '上下文桥（Context Bridge）是一种支持不同 JavaScript 执行环境之间相互调用的机制。',
        },
    },
    theme: defaultTheme({
        repo: 'https://github.com/memo-cn/context-bridge',
        locales: {
            '/en-US/': {
                editLinkText: 'Edit',
                selectLanguageText: '语言',
                selectLanguageName: 'English',
            },
            '/zh-CN/': {
                editLinkText: '编辑',
                selectLanguageName: '简体中文',
                navbar: [
                    {
                        text: '指南',
                        link: '/zh-CN/guide/快速开始.md',
                    },
                    {
                        text: 'API',
                        link: '/zh-CN/api/',
                    },
                ],
                sidebar: {
                    '/zh-CN/guide/': [{ text: '指南', children: ['快速开始.md', '场景示例.md', '进阶技巧.md'] }],
                    '/zh-CN/api/': [
                        {
                            text: 'API',
                            link: '.',
                            children: ['选项.md', '实例.md', '性能指标.md'],
                        },
                    ],
                },
            },
        },
    }),
});