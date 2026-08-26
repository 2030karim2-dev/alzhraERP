import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintPluginSecurity from 'eslint-plugin-security';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
    {
        ignores: [
            'dist',
            'node_modules',
            'coverage',
            '*.config.js',
            '*.config.ts',
            'src/core/database.types.ts',
            'e2e/**',
            // Deno Edge Functions — ملفات مستقلة عن مشروع Vite/React (لا TSConfig يغطيها).
            'supabase/**',
            // Vitest setup وأدوات الصيانة (tsx scripts) — ليست كود التطبيق المنشور،
            // وخارج مشروع TSConfig الذي يغذّي المحلل النوعي (نفس منطق e2e/**).
            'test/**',
            'scripts/**',
        ],
    },
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
                project: ['./tsconfig.json', './tsconfig.eslint.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            'security': eslintPluginSecurity,
            'jsx-a11y': jsxA11y,
        },
        rules: {
            // React Hooks
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],

            // ============================================
            // Accessibility (jsx-a11y) — Critical Rules
            // ============================================
            ...jsxA11y.configs.recommended.rules,
            'jsx-a11y/label-has-associated-control': ['error', {
                assert: 'either',
                depth: 3,
            }],
            'jsx-a11y/no-autofocus': 'warn',
            'jsx-a11y/aria-props': 'error',
            'jsx-a11y/aria-proptypes': 'error',
            'jsx-a11y/aria-unsupported-elements': 'error',
            'jsx-a11y/role-has-required-aria-props': 'error',
            'jsx-a11y/role-supports-aria-props': 'error',
            'jsx-a11y/alt-text': 'error',
            'jsx-a11y/anchor-has-content': 'error',
            'jsx-a11y/aria-role': 'error',
            'jsx-a11y/click-events-have-key-events': 'warn',
            'jsx-a11y/no-static-element-interactions': 'warn',
            'jsx-a11y/interactive-supports-focus': 'warn',
            'jsx-a11y/media-has-caption': 'warn',
            'jsx-a11y/no-noninteractive-element-interactions': 'warn',
            'jsx-a11y/tabindex-no-positive': 'error',

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
            'jsx-a11y/alt-text': 'off',
            'jsx-a11y/label-has-associated-control': 'off',
            'jsx-a11y/no-autofocus': 'off',
        },
    },
    // ============================================================
    // Financial-critical gate (npm run lint:critical)
    // ------------------------------------------------------------
    // طبقات المال والمخزون: api/ services/ usecases/ core-services/ lib.
    // نطاق البوابة = قواعد الصحة المالية فقط، مع كتم ضجيج الأسلوب
    // الموروث من الإعداد العام حتى يكون مخرج البوابة إشارة خالصة
    // وقابلة للإنفاذ اليوم (exit 0 مطلوب في CI).
    // ============================================================
    {
        files: [
            'src/features/*/api/**/*.{ts,tsx}',
            'src/features/*/services/**/*.{ts,tsx}',
            'src/features/*/service.ts',
            'src/core/usecases/**/*.ts',
            'src/core/services/**/*.ts',
            'src/lib/*.ts',
        ],
        rules: {
            // ── Style noise OFF (signal purity) ──
            'max-lines-per-function': 'off',
            'complexity': 'off',
            '@typescript-eslint/strict-boolean-expressions': 'off',
            '@typescript-eslint/no-unnecessary-condition': 'off',
            '@typescript-eslint/prefer-nullish-coalescing': 'off',
            '@typescript-eslint/prefer-optional-chain': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-confusing-void-expression': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',
            'security/detect-object-injection': 'off',

            // ── THE GATE — financial-critical invariants ──
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/restrict-plus-operands': 'error',
            '@typescript-eslint/no-explicit-any': 'error',
        },
    },
);
