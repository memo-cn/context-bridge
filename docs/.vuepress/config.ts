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
        docsDir: 'docs',
        contributors: false,
        locales: {
            '/en-US/': {
                editLinkText: 'Edit',
                selectLanguageText: '选择语言',
                selectLanguageName: 'English',
                navbar: [
                    {
                        text: 'Change Log',
                        link: '/en-US/CHANGELOG.md',
                    },
                ],
            },
            '/zh-CN/': {
                editLinkText: '编辑此页',
                lastUpdatedText: '上次更新',
                selectLanguageName: '简体中文',
                navbar: [
                    {
                        text: '指南',
                        link: '/zh-CN/guide/quick-start.md',
                        activeMatch: '/zh-CN/guide/',
                    },
                    {
                        text: 'API',
                        link: '/zh-CN/api/',
                    },
                    {
                        text: '更新日志',
                        link: '/zh-CN/CHANGELOG.md',
                    },
                ],
                sidebar: {
                    '/zh-CN/guide/': [
                        { text: '指南', children: ['quick-start.md', 'scenario-examples.md', 'practical-skills.md'] },
                    ],
                    '/zh-CN/api/': [
                        {
                            text: 'API',
                            link: '.',
                            children: ['options.md', 'instance.md', 'performance-entry.md'],
                        },
                    ],
                },
            },
        },
    }),
});
