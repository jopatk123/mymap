// 轻量调试工具，生产建议保持为 false
export const DEBUG = false
export function dlog(...args) {
  if (DEBUG) console.log(...args)
}
