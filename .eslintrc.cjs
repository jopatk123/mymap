module.exports = {
  root: true,
  env: {
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignorePatterns: [
    '**/dist/**',
    '**/coverage/**',
    'server/logs/**',
    'server/server/logs/**',
    'tmp/**',
    'mymap_image.tar',
  ],
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^(_|props$)' }],
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-control-regex': 'warn',
    'no-useless-escape': 'warn',
  },
  overrides: [
    {
      files: ['client/**/*.{js,vue}'],
      env: {
        browser: true,
        node: false,
      },
      parser: 'vue-eslint-parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      extends: ['plugin:vue/vue3-recommended'],
      globals: {
        defineProps: 'readonly',
        defineEmits: 'readonly',
        defineExpose: 'readonly',
        withDefaults: 'readonly',
        L: 'readonly',
        AMap: 'readonly',
      },
      rules: {
        'vue/no-mutating-props': 'warn',
        'vue/multi-word-component-names': 'off',
        'vue/max-attributes-per-line': 'off',
        'vue/singleline-html-element-content-newline': 'off',
        'vue/multiline-html-element-content-newline': 'off',
        'vue/html-self-closing': 'off',
        'vue/first-attribute-linebreak': 'off',
        'vue/html-closing-bracket-newline': 'off',
        'vue/html-indent': 'off',
      },
    },
    {
      files: ['server/**/*.{js,cjs}', '*.cjs'],
      env: {
        browser: false,
        node: true,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
      },
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: ['server/**/*.{test,spec}.{js,cjs}'],
      env: {
        jest: true,
      },
    },
    {
      files: ['client/src/**/*.{test,spec}.{js,ts,vue}'],
      env: {
        browser: true,
      },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
    {
      files: [
        '**/*.config.{js,cjs,mjs}',
        '**/vite.config.js',
        '**/vite.config.cjs',
        '**/eslint.config.{js,cjs,mjs}',
      ],
      env: {
        browser: false,
        node: true,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
      },
    },
  ],
};
