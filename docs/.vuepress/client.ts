import { defineClientConfig } from '@vuepress/client';

export default defineClientConfig({
    enhance({ app, router, siteData }) {
        // 访问首页时结合浏览器语言进行重定向
        router.afterEach(function (to, from) {
            if (to.path === '/') {
                if (typeof window?.navigator?.language === 'string') {
                    if (window.navigator.language.match(/zh/)) {
                        router.replace('/zh-CN/');
                    } else {
                        router.replace('/en-US/');
                    }
                }
            }
        });
    },
    setup() {},
    rootComponents: [],
});
