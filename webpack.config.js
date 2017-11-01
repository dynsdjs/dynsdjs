const path = require('path'),
      webpack = require('webpack'),
      BabiliPlugin = require('babili-webpack-plugin'),
      WebpackSourceMapSupport = require('webpack-source-map-support')

module.exports = function( env ) {
  let config = {
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
      libraryTarget: 'umd2'
    },
    plugins: []
  }

  if ( !env ) {
    // ---- DEV ----
    config.devtool = 'inline-source-map'

    Array.prototype.push.apply(
      config.plugins,
      [
        new WebpackSourceMapSupport()
      ]
    )
  } else {
    // ---- PROD ----
    Array.prototype.push.apply(
      config.plugins,
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
  }

  return config
}