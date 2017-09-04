import restify from 'restify'

export default () => {
  const server = restify.createServer()

  server.get(
    '/api',
    ( req, res, next ) => {
      global.zeroDns.dns.cache.keys(
        ( err, keys ) => {
          // Set it globally
          global.zeroDns.http.stats.totalEntries = keys.length

          // Start the local response logic
          let ret = Object.assign( {}, global.zeroDns.http.stats )

          keys.forEach(
            ( key ) => {
              let o = global.zeroDns.dns.cache.get( key )
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
        .listen( global.zeroDns.http.port, () => {
          console.log( `>> HTTP Port listening on: ${server.url}` )
          resolve()
        })
    }
  )
}