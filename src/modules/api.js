import restify from 'restify'

export default ( config ) => {
  const server = restify.createServer()

  server.get(
    '/api',
    ( req, res, next ) => {
      config.dns.cache.keys(
        ( err, keys ) => {
          // Set it globally
          config.http.stats.totalEntries = keys.length

          // Start the local response logic
          let ret = Object.assign( {}, config.http.stats )

          keys.forEach(
            ( key ) => {
              let o = config.dns.cache.get( key )
              ret.totalHits += o.hit
            }
          )

          res.send( ret )
          next()
        }
      )
    }
  )

  return new Promise (
    ( resolve, reject ) => {
      server
        .on( 'error', e => reject( e.message ) )
        .listen( config.http.port, () => {
          console.log( `>> HTTP Port listening on: ${server.url}` )
          resolve( config )
        })
    }
  )
}