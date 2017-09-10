import dns from 'native-dns'
import fetch from 'node-fetch'
import fs from 'fs'
import ip from 'ip'

class DnsHandler {
  constructor( config ) {
    this.config = config
  }

  request( req, res ) {
    const me = this,
          promises = []

    me.res = res

    if ( !( req.address.address in me.config.http.stats.clients ) ) {
      me.config.http.stats.clients[ req.address.address ] = {
        'ads': 0,
        'generic': 0
      }
    }

    req.question.forEach( function ( question ) {
      const adDomain = me.config.dns.cache.get( question.name )

      if ( adDomain ) {
        res
          .answer
          .push(
            dns.A({
              name: question.name,
              address: ip.address( 'private', 'ipv4' ),
              ttl: 600
            })
          )

        res
          .answer
          .push(
            dns.AAAA({
              name: question.name,
              address: ip.address( 'private', 'ipv6' ),
              ttl: 600
            })
          )

        me.config.http.stats.clients[ req.address.address ].ads++

        me.config.dns.cache.set( question.name, { hit: ++adDomain.hit } )
      } else {
        me.config.http.stats.clients[ req.address.address ].generic++

        promises.push(
          me._recurse( req.address.family.toLowerCase(), question )
        )
      }
    })

    Promise
      .all( promises )
      .then( () => res.send() )
      .catch( err => console.log( err ) )
  }

  _recurse( ip, question ) {
    const me = this,
          resolver = me.config.dns.resolver[ ip ][ Math.round( Math.random() ) ]

    return new Promise(
      ( resolve, reject ) => {
        dns
          .Request({
            question: question,
            server: {
              address: resolver,
              'port': 53,
              'type': 'udp'
            },
            timeout: 1000
          })
          .on( 'timeout', () => reject( `>> DNS: Recursive question '${question.name}' went in timeout with resolver '${resolver}:53'` ) )
          .on( 'message',
            (err, msg) => {
              msg.answer
                .forEach( answer => me.res.answer.push( answer ) )
            }
          )
          .on( 'end', resolve )
          .send()
      }
    )
  }
}

export default ( config ) => {
  const udp4Server = dns.createServer( { dgram_type: { type: 'udp4', reuseAddr: true } } ),
        udp6Server = dns.createServer( { dgram_type: { type: 'udp6', reuseAddr: true } } ),
        tcpServer  = dns.createTCPServer(),
        dnsHandler = new DnsHandler( config )

  return new Promise (
    ( resolve, reject ) => {
      Promise
        .resolve()
        .then(
          () => {
            return new Promise (
              ( resolve, reject ) => {
                tcpServer
                  .on( 'socketError', ( e ) => reject( `[DNS] TCP: ${e.message}` ) )
                  .on( 'request', ( req, res ) => dnsHandler.request( req, res ) )
                  .on( 'listening', () => {
                    console.log( `>> DNS: Listening on [::]:53/tcp` )
                    resolve()
                  })
                  .serve( config.dns.port )
              }
            )
          }
        )
        .then(
          () => {
            return new Promise (
              ( resolve, reject ) => {
                udp4Server
                  .on( 'socketError', ( e ) => reject( `[DNS] UDP4: ${e.message}` ) )
                  .on( 'request', ( req, res ) => dnsHandler.request( req, res ) )
                  .on( 'listening', () => {
                    console.log( `>> DNS: Listening on 0.0.0.0:53/udp` )
                    resolve()
                  })
                  .serve( config.dns.port )
              }
            )
          }
        )
        .then(
          () => {
            return new Promise (
              ( resolve, reject ) => {
                udp6Server
                  .on( 'socketError', ( e ) => reject( `[DNS] UDP6: ${e.message}` ) )
                  .on( 'request', ( req, res ) => dnsHandler.request( req, res ) )
                  .on( 'listening', () => {
                    console.log( `>> DNS: Listening on [::]:53/udp` )
                    resolve()
                  })
                  .serve( config.dns.port )
              }
            )
          }
        )
        .then(
          () => resolve( config )
        )
    }
  )
}