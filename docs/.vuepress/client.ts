import { defineClientConfig } from '@vuepress/client';

export default defineClientConfig({
    enhance({ app, router, siteData }) {
        // 访问首页时结合浏览器语言进行重定向
        router.afterEach(function (to, from) {
            if (to.path === '/') {
                if (String(globalThis?.navigator?.language).match(/zh/)) {
                    router.replace('/zh-CN/');
                } else {
                    router.replace('/en-US/');
                }
            }
        });
        setTimeout(() => {
            if (typeof document !== 'undefined') {
                document.head.insertAdjacentHTML(
                    'beforeend',
                    `<style>
body {
  --c-text-accent: #0ae;
  --c-brand: #0ae;
  --code-bg-color: #000;
}
</style>`,
                );
            }
        });
    },
    setup() {},
    rootComponents: [],
});
