/**
 * 将十六进制颜色（包括6位和8位）转换为RGBA格式。
 * @param {string} hex - 十六进制颜色字符串 (e.g., "#RRGGBB" or "#RRGGBBAA").
 * @returns {string} RGBA格式的颜色字符串 (e.g., "rgba(r, g, b, a)").
 */
export function hexToRgba(hex) {
  if (!hex || typeof hex !== 'string') {
    return 'rgba(255, 120, 0, 1)'; // 返回一个默认颜色
  }

  let hexValue = hex.startsWith('#') ? hex.substring(1) : hex;

  if (hexValue.length !== 6 && hexValue.length !== 8) {
    // 对于无效长度，返回默认颜色
    return 'rgba(255, 120, 0, 1)';
  }

  const r = parseInt(hexValue.substring(0, 2), 16);
  const g = parseInt(hexValue.substring(2, 4), 16);
  const b = parseInt(hexValue.substring(4, 6), 16);
  const a = hexValue.length === 8 ? parseInt(hexValue.substring(6, 8), 16) / 255 : 1;

  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

/**
 * 将RGBA或RGB颜色转换为8位十六进制（#RRGGBBAA）格式。
 * @param {string} rgba - RGBA或RGB格式的颜色字符串.
 * @returns {string} 8位十六进制格式的颜色字符串.
 */
export function rgbaToHex(rgba) {
  if (!rgba || typeof rgba !== 'string' || !rgba.toLowerCase().startsWith('rgb')) {
    return '#ff7800ff'; // 返回一个默认颜色
  }

  const parts = rgba.substring(rgba.indexOf('(') + 1, rgba.lastIndexOf(')')).split(/,\s*/);
  
  const r = parseInt(parts[0], 10);
  const g = parseInt(parts[1], 10);
  const b = parseInt(parts[2], 10);
  const a = parts.length === 4 ? parseFloat(parts[3]) : 1;

  const toHex = (c) => ('0' + c.toString(16)).slice(-2);
  
  const alphaHex = toHex(Math.round(a * 255));

  return `#${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}`;
}
