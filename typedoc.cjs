module.exports = {
  entryPoints: ['src'],
  entryPointStrategy: 'expand',
  out: 'docs/typedoc-md',
  plugin: ['typedoc-plugin-markdown'],
  excludePrivate: true,
  tsconfig: 'tsconfig.app.json'
};
