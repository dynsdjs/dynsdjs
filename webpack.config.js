const path = require('path'),
      webpack = require('webpack'),
      package = require('./package.json')
      TerserPlugin = require('terser-webpack-plugin')

module.exports = function( env ) {
  const filename = package.main.replace( 'dist/', '' ),
        libraryName = filename.replace( '.js', '' )

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
      filename: filename,
      library: libraryName,
      libraryTarget: 'umd2'
    },
    plugins: []
  }

  if ( env.prod ) {
    // ---- PROD ----
    config.optimization = {
      minimize: true,
      minimizer: [new TerserPlugin()],
    }
  } else {
    // ---- DEV ----
    config.devtool = 'inline-source-map'

    Array.prototype.push.apply(
      config.plugins,
      [
        new webpack.BannerPlugin({
          banner: 'require("source-map-support").install();',
          raw: true,
          entryOnly: false
        })
      ]
    )
  }

  return config
}