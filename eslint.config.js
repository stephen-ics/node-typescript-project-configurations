import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    '.runs/**',
    'output/**',
    'tmp/**',
    '.husky/_/**',
  ]),
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: { globals: globals.node },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      eqeqeq: ['error', 'always', { null: 'never' }],
      'no-else-return': 'error',
      'no-lonely-if': 'error',
      'no-unneeded-ternary': 'error',
      'no-unreachable-loop': 'error',
      'no-useless-call': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-concat': 'error',
      'no-useless-rename': 'error',
      'no-void': ['error', { allowAsStatement: true }],
      'object-shorthand': ['error', 'always'],
      'prefer-object-has-own': 'error',
      'prefer-template': 'error',
      radix: 'error',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    rules: { 'default-param-last': 'error' },
  },
  {
    files: ['src/**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        // The `typescript` package alias supplies the TS6 API for typed linting.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Explicit overrides express project policy; other safety rules come from the preset.
      '@typescript-eslint/default-param-last': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          minimumDescriptionLength: 10,
          'ts-check': false,
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
        },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: false,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: false,
          allowDirectConstAssertionInArrowFunctions: false,
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: true,
        },
      ],
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        {
          ignoreVoidReturningFunctions: true,
        },
      ],
      '@typescript-eslint/no-unnecessary-condition': [
        'error',
        {
          allowConstantLoopConditions: true,
        },
      ],
      '@typescript-eslint/no-floating-promises': [
        'error',
        { ignoreVoid: false },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      // Its suggested ! assertion is forbidden by our safety rules.
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',
      // Preserve the strict preset's restrictions when allowing numeric interpolation.
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowAny: false,
          allowBoolean: false,
          allowNever: false,
          allowNullish: false,
          allowNumber: true,
          allowRegExp: false,
        },
      ],
    },
  },
  prettier,
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    // Prettier disables curly generally; the 'all' option is compatible with formatting.
    rules: { curly: ['error', 'all'] },
  },
);
