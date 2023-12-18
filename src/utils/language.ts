// 环境默认语言
export let envDefaultLanguage: 'zh-CN' | 'en-US' = 'en-US';

try {
    if (
        String(
            globalThis?.navigator?.language ||
                (globalThis as any)?.process?.env?.LANG ||
                (globalThis as any)?.process?.env?.LC_CTYPE,
        )
            .toLowerCase()
            .includes('zh')
    ) {
        envDefaultLanguage = 'zh-CN';
    }
} catch (e) {}

/**
 * 根据浏览器语言设置返回相应的字符串。
 * @param zh 简体中文字符串。
 * @param en 英文字符串。
 * @param language 语言
 * @returns 如果浏览器语言设置为简体中文（zh-cn）, 则返回 zh 参数, 否则返回 en 参数。
 */
export function zhOrEn(zh: string, en: string, language: 'zh-CN' | 'en-US') {
    if (language === 'zh-CN') {
        return zh;
    } else if (language === 'en-US') {
        return en;
    }
    return envDefaultLanguage === 'zh-CN' ? zh : en;
}

export function isZh(language: 'zh-CN' | 'en-US') {
    return language === 'zh-CN';
}
