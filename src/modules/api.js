import restify from 'restify'

export default class {
  constructor( dns ) {
    const me = this

    this._port = process.env.HTTPPORT || 80

    this._stats = {
      'clients': {},
      'internalEntries': 0,
      'totalHits': 0
    }

    dns
      .on( 'init', ( entries ) => {
        me._start( entries )
      })
      .on( 'resolve.internal', ( currentQuestion, req, res ) => me._countHit( currentQuestion, req, res ) )
      .on( 'resolve.external', ( currentQuestion, req, res ) => me._countHit( currentQuestion, req, res ) )
  }

  _countHit( currentQuestion, req, res ) {
    const me = this

    if ( !( req.address.address in me._stats.clients ) )
      me._stats.clients[ req.address.address ] = {}

    if ( !( currentQuestion.name in me._stats.clients[ req.address.address ] ) )
      me._stats.clients[ req.address.address ][ currentQuestion.name ] = { hit: 0 }

    me._stats.clients[ req.address.address ][ currentQuestion.name ].hit++
  }

  _start( entries ) {
    const me = this,
          server = restify.createServer()

    server
      .get(
        '/api',
        ( req, res, next ) => {
          entries.keys(
            ( err, keys ) => {
              // Set it globally
              me._stats.internalEntries = keys.length

              // Start the local response logic
              let ret = Object.assign( {}, me._stats )

              Object.keys( me._stats.clients)
                .forEach(
                  ( client ) => {
                    Object.keys( me._stats.clients[ client ] )
                      .forEach(
                        domain => ret.totalHits += me._stats.clients[ client ][ domain ].hit
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
      .listen( me._port, () => {
        console.log( `>> HTTP Port listening on: ${server.url}` )
      })
  }
}