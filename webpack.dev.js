const path = require('path'),
      webpack = require('webpack')

module.exports = {
  entry: './src/',
  target: 'node',
  node: {
    __dirname: false,
    __filename: false,
  },
  stats: {
    warnings: false
  },
  resolve: {
    extensions: [ '.js' ]
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'Dynsd.js',
    library: 'Dynsd',
    libraryTarget: "umd2"
  },
  plugins: []
};
