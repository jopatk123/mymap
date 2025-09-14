module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: ['eslint:recommended', 'plugin:vue/vue3-recommended', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // 项目可根据需要调整规则
    'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // 允许空的 catch 块（许多位置使用空块作为占位）
    'no-empty': ['error', { allowEmptyCatch: true }],
    // 在短期内将变更 props 的规则降低为警告，便于渐进修复
    'vue/no-mutating-props': 'warn',
    // 允许单词组件名（在本项目中 index.vue 较多）
    'vue/multi-word-component-names': 'off',
    // 减少某些严格字符串/正则检查为警告
    'no-control-regex': 'warn',
    'no-useless-escape': 'warn',
  },
};
