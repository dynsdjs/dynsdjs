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
    filename: 'ZeroAds.js',
    library: 'ZeroAds',
    libraryTarget: "umd2"
  },
  plugins: [
    // Fix "require is not a function" for restify
    // See https://github.com/felixge/node-formidable/issues/337#issuecomment-153408479
    new webpack.DefinePlugin({ "global.GENTLY": false })
  ]
};
