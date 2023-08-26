// 是否为中文
const isZh = String(
    globalThis?.navigator?.language ||
        (globalThis as any)?.process?.env?.LANG ||
        (globalThis as any)?.process?.env?.LC_CTYPE,
)
    .toLowerCase()
    .includes('zh');

/**
 * 根据浏览器语言设置返回相应的字符串。
 * @param zh 简体中文字符串。
 * @param en 英文字符串。
 * @returns 如果浏览器语言设置为简体中文（zh-cn）, 则返回 zh 参数, 否则返回 en 参数。
 */
export function zhOrEn(zh: string, en: string) {
    return isZh ? zh : en;
}
