import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintPluginSecurity from 'eslint-plugin-security';

export default tseslint.config(
    { ignores: ['dist', 'node_modules', 'coverage', '*.config.js', '*.config.ts'] },
    {
        extends: [
            js.configs.recommended,
            ...tseslint.configs.strictTypeChecked,
            ...tseslint.configs.stylisticTypeChecked,
        ],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
            parserOptions: {
                project: ['./tsconfig.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            'security': eslintPluginSecurity,
        },
        rules: {
            // React Hooks
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],

            // ============================================
            // Code Quality - Strict Rules
            // ============================================

            // No console in production code
            'no-console': ['error', {
                allow: ['info', 'warn', 'error']
            }],

            // Enforce consistent type usage
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unsafe-argument': 'error',
            '@typescript-eslint/no-unsafe-assignment': 'error',
            '@typescript-eslint/no-unsafe-call': 'error',
            '@typescript-eslint/no-unsafe-member-access': 'error',
            '@typescript-eslint/no-unsafe-return': 'error',

            // Prefer type-safe patterns
            '@typescript-eslint/consistent-type-imports': ['error', {
                prefer: 'type-imports',
                fixStyle: 'inline-type-imports',
            }],
            '@typescript-eslint/no-import-type-side-effects': 'error',
            '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

            // Strict null checks
            '@typescript-eslint/no-unnecessary-condition': 'error',
            '@typescript-eslint/strict-boolean-expressions': 'error',

            // Code complexity
            'complexity': ['error', { max: 10 }],
            'max-lines-per-function': ['error', { max: 50, skipComments: true }],
            'max-params': ['error', { max: 4 }],

            // Code style
            '@typescript-eslint/prefer-nullish-coalescing': 'error',
            '@typescript-eslint/prefer-optional-chain': 'error',
            '@typescript-eslint/prefer-readonly': 'error',
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
            }],

            // Explicit return types for better type safety
            '@typescript-eslint/explicit-function-return-type': ['error', {
                allowExpressions: true,
                allowTypedFunctionExpressions: true,
                allowHigherOrderFunctions: true,
                allowDirectConstAssertionInArrowFunctions: true,
            }],

            // Consistent array type style
            '@typescript-eslint/array-type': ['error', {
                default: 'array-simple',
            }],

            // Ban @ts-ignore, prefer @ts-expect-error with description
            '@typescript-eslint/ban-ts-comment': ['error', {
                'ts-expect-error': 'allow-with-description',
                'ts-ignore': true,
                'ts-nocheck': true,
                'ts-check': false,
                minimumDescriptionLength: 10,
            }],

            // ============================================
            // Security Rules
            // ============================================
            'security/detect-object-injection': 'error',
            'security/detect-non-literal-regexp': 'error',
            'security/detect-unsafe-regex': 'error',
            'security/detect-buffer-noassert': 'error',
            'security/detect-eval-with-expression': 'error',
            'security/detect-no-csrf-before-method-override': 'error',
            'security/detect-non-literal-fs-filename': 'off',
            'security/detect-non-literal-require': 'off',
            'security/detect-possible-timing-attacks': 'error',
            'security/detect-pseudoRandomBytes': 'error',

            // ============================================
            // React Best Practices
            // ============================================
            'react-hooks/exhaustive-deps': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
        },
    },
    // Test files configuration
    {
        files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
        rules: {
            'no-console': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            'max-lines-per-function': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
        },
    },
    // Scripts and config files
    {
        files: ['scripts/**/*', '*.config.{js,ts}'],
        rules: {
            'no-console': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
        },
    }
);
