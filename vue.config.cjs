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
      },
    },
  },
});
