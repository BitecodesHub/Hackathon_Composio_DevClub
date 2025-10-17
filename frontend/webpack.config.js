const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: [require.resolve('react-refresh/babel')].filter(Boolean),
          },
        },
      },
    ],
  },
  plugins: [
    new ReactRefreshWebpackPlugin(),
  ],
  devServer: {
    hot: true,
    open: true,
  },
};
