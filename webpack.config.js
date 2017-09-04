module.exports = function( env ) {
  // Default to dev if no environment given
  if ( !env ) env = 'dev'

  return require(`./webpack.${env}.js`)
}
