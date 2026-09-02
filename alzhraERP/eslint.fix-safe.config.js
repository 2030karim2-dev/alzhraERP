import base from './eslint.config.js';

/**
 * TEMPORARY one-off config — safe autofix pass to pay down lint debt.
 *
 * Contains ONLY auto-fixable rules that are provably safe (type-level /
 * syntactic rewrites with zero runtime behavior change). Behavior-changing
 * rules (prefer-nullish-coalescing, strict-boolean-expressions,
 * only-throw-error, prefer-promise-reject-errors, ...) are deliberately
 * EXCLUDED — they need human review.
 *
 * Usage (then DELETE this file):
 *   npx eslint src --config eslint.fix-safe.config.js --fix
 */
export default [
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // import → import type (erased at runtime anyway)
      '@typescript-eslint/consistent-type-imports': 'error',
      // T[] vs Array<T> — type-level only
      '@typescript-eslint/array-type': 'error',
      // removes assertions whose type equals the underlying expression
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      // removes redundant String()/Number() where type already matches
      '@typescript-eslint/no-unnecessary-type-conversion': 'error',
      // removes annotations identical to the inferred type
      '@typescript-eslint/no-inferrable-types': 'error',
      // a && a.b → a?.b (type-aware: only fires when a is object|nullish)
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/non-nullable-type-assertion-style': 'error',
      '@typescript-eslint/consistent-indexed-object-style': 'error',
      '@typescript-eslint/no-duplicate-type-constituents': 'error',
      '@typescript-eslint/prefer-reduce-type-parameter': 'error',
      '@typescript-eslint/prefer-regexp-exec': 'error',
      '@typescript-eslint/prefer-for-of': 'error',
      '@typescript-eslint/return-await': 'error',
      '@typescript-eslint/dot-notation': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/no-useless-constructor': 'error',
      // core syntactic rules
      'prefer-const': 'error',
      'no-extra-boolean-cast': 'error',
      'no-useless-escape': 'error',
    },
  },
];
