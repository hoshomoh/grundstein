import js from '@eslint/js'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'src/routeTree.gen.ts'],
  },

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // STANDARDS.md §3: every signature carries its types; `any` needs a reason.
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      // STANDARDS.md §5 writes prop and model shapes as `type`, and a discriminated
      // union cannot be an interface at all. Point the rule at the house style.
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // STANDARDS.md §4: no silently swallowed failure.
      'no-empty': ['error', { allowEmptyCatch: false }],
      '@typescript-eslint/only-throw-error': 'error',

      // STANDARDS.md §5: useEffect is a last resort, so each one is argued for in writing.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="useEffect"]:not([leadingComments])',
          message:
            'useEffect is a last resort (STANDARDS.md §5). Check the table first, and if it is genuinely external synchronisation, comment above it saying which system it synchronises with.',
        },
      ],
    },
  },

  // decimal.js is configured in exactly one place, so it is imported in exactly one
  // place. Everything else goes through `@/domain/money` (STANDARDS.md §4).
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/domain/money.ts', 'src/domain/money.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'decimal.js',
              message:
                'Import Money and its helpers from @/domain/money — decimal.js is configured there and nowhere else.',
            },
          ],
        },
      ],
    },
  },

  // domain/ is pure: no React, no browser, no I/O.
  {
    files: ['src/domain/**/*.ts'],
    ignores: ['src/domain/money.ts', 'src/domain/money.test.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'domain/ is pure (STANDARDS.md §1).' },
        { name: 'document', message: 'domain/ is pure (STANDARDS.md §1).' },
        { name: 'localStorage', message: 'domain/ is pure (STANDARDS.md §1).' },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'decimal.js',
              message:
                'Import Money and its helpers from @/domain/money — decimal.js is configured there and nowhere else.',
            },
          ],
          patterns: [
            { group: ['@/lib/*', '@/state/*', '@/i18n/*', '@/components/*', '@/features/*'] },
            { group: ['react', 'react-dom', 'react-i18next'] },
          ],
        },
      ],
    },
  },

  // A TanStack Router file must export `Route` beside its component; that is the
  // framework's contract, not an accident, so fast-refresh has nothing to warn about.
  {
    files: ['src/routes/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // Generated shadcn output is never hand-edited, so it is never linted either.
  {
    files: ['src/components/ui/**'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },

  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  // The setup file patches globals jsdom does not implement. Stubs are empty and
  // unbound by nature, and the rules that object to that are about application code.
  {
    files: ['src/test/setup.ts'],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },

  // A context file exports its provider and its hook together; splitting them to
  // satisfy fast refresh would put the two halves of one thing in two files.
  {
    files: ['src/**/*-context.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  {
    files: ['*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
    extends: [tseslint.configs.disableTypeChecked],
  },
)
