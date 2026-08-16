const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  transpileDependencies: true,
  pages: {
    index: {
      entry: 'example/main.ts',
      template: 'example/index.html',
      filename: 'index.html',
      title: 'Centaur Medical',
    },
  },
  configureWebpack: {
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },
  },
  chainWebpack(config) {
    // Ne pas typechecker les tests pendant `serve` / `build`
    if (config.plugins.has('fork-ts-checker')) {
      config.plugin('fork-ts-checker').tap((args) => {
        const option = args[0] || {};
        option.typescript = option.typescript || {};
        option.typescript.configOverwrite = {
          ...(option.typescript.configOverwrite || {}),
          exclude: ['node_modules', 'tests'],
        };
        args[0] = option;
        return args;
      });
    }
  },
  css: {
    extract: false,
  },
  devServer: {
    port: 8084,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        timeout: 0,
        proxyTimeout: 0,
      },
    },
  },
});
