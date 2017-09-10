import restify from 'restify'

const port = process.env.HTTPPORT || 80,
      stats = {
        'clients': {},
        'internalEntries': 0,
        'totalHits': 0
      }

function countHit( currentQuestion, req, res ) {
  if ( !( req.address.address in stats.clients ) )
    stats.clients[ req.address.address ] = {}

  if ( !( currentQuestion.name in stats.clients[ req.address.address ] ) )
    stats.clients[ req.address.address ][ currentQuestion.name ] = { hit: 0 }

  stats.clients[ req.address.address ][ currentQuestion.name ].hit++
}

function start( entries ) {
  const server = restify.createServer()

  server
    .get(
      '/api',
      ( req, res, next ) => {
        entries.keys(
          ( err, keys ) => {
            // Set it globally
            stats.internalEntries = keys.length

            // Start the local response logic
            let ret = Object.assign( {}, stats )

            Object.keys( stats.clients)
              .forEach(
                ( client ) => {
                  Object.keys( stats.clients[ client ] )
                    .forEach(
                      domain => ret.totalHits += stats.clients[ client ][ domain ].hit
                    )
                }
              )

            res.send( ret )
            next()
          }
        )
      }
    )

  server
    .on( 'error', e => reject( e.message ) )
    .listen( port, () => {
      console.log( `>> HTTP Port listening on: ${server.url}` )
    })
}

export default class {
  constructor( dns ) {
    dns
      .on( 'init', ( entries ) => {
        start( entries )
      })
      .on( 'resolve.internal', ( currentQuestion, req, res ) => countHit( currentQuestion, req, res ) )
      .on( 'resolve.external', ( currentQuestion, req, res ) => countHit( currentQuestion, req, res ) )
  }
}