export const useHighlight = () => {
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 将文本按关键字分割为安全的片段数组 { text, isMatch }
  const safeHighlight = (text, keyword) => {
    if (!text || !keyword) return [{ text, isMatch: false }];

    const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const idx = match.index;
      if (idx > lastIndex) {
        parts.push({ text: text.substring(lastIndex, idx), isMatch: false });
      }
      parts.push({ text: match[0], isMatch: true });
      lastIndex = idx + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), isMatch: false });
    }
    return parts;
  };

  return { safeHighlight };
};
