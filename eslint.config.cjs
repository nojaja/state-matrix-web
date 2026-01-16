module.exports = [
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**'] },
  {
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    },
    plugins: {
      sonarjs: require('eslint-plugin-sonarjs'),
      jsdoc: require('eslint-plugin-jsdoc'),
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin')
    },
    rules: {
      'sonarjs/cognitive-complexity': ['error', 10],
      'no-unused-vars': ['warn'],
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true
          }
        }
      ],
      'jsdoc/require-param': 'error',
      'jsdoc/require-returns': 'error'
    }
  }
  ,
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: require('vue-eslint-parser'),
      parserOptions: {
        parser: require('@typescript-eslint/parser'),
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    },
    plugins: {
      vue: require('eslint-plugin-vue')
    },
    rules: {}
  }
];
