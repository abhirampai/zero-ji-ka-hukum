import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.expo/**', 'mobile/**'],
  },
  ...tseslint.configs.recommended,
);
