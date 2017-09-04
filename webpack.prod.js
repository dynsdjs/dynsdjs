const webpack = require('webpack'),
      BabiliPlugin = require('babili-webpack-plugin'),
      webpackConfig = require('./webpack.dev.js')

Array.prototype.push.apply(
  webpackConfig.plugins,
  [
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false
    }),
    new BabiliPlugin({}, {
      comments: false,
      sourceMap: false
    })
  ]
)

module.exports = webpackConfig
