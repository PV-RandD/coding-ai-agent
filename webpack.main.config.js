const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './main.js',
  target: 'electron-main',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
  },
  externals: {
    // Keep these as external dependencies (not bundled)
    '@tetherto/qvac-sdk': 'commonjs @tetherto/qvac-sdk',
    'bare-runtime-linux-x64': 'commonjs bare-runtime-linux-x64',
    // Add other native modules here if needed
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
};
