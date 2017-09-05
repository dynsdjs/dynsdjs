import dns from 'native-dns'
import fetch from 'node-fetch'
import fs from 'fs'
import ip from 'ip'
//import readline from 'readline'

/*function parseHostsRecords ( url, cb ) {
  fetch( url )
    .then( res => {})
    .then( body => {
      if ( body ) {
        body
          .split('\n')
          .forEach(
            ( line ) => {
              if ( !line.startsWith( '#' ) ) {
                var host = line.split( /\s+/ ),
                    domain = ''

                if ( host.length < 2 )
                  domain = host[0]
                else
                  domain = host[1]

                global.zeroDns.dns.cache
                .set( domain, { hit: 0 } )
              }
            }
          )
          cb()
      }
    })
}
*/

function proxyDnsRequest ( ipType, question, response ) {
  const resolver = global.zeroDns.dns.resolver[ ipType ][ Math.round( Math.random() ) ]

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
              .forEach( answer => response.answer.push( answer ) )
          }
        )
        .on( 'end', resolve )
        .send()
    }
  )
}

function answerDnsRequest ( req, res ) {
  let promises = []

  if ( !( req.address.address in global.zeroDns.http.stats.clients ) ) {
    global.zeroDns.http.stats.clients[ req.address.address ] = {
      'ads': 0,
      'generic': 0
    }
  }

  req.question.forEach( function ( question ) {
    const adDomain = global.zeroDns.dns.cache.get( question.name )

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

      global.zeroDns.http.stats.clients[ req.address.address ].ads++

      global.zeroDns.dns.cache.set( question.name, { hit: ++adDomain.hit } )
    } else {
      global.zeroDns.http.stats.clients[ req.address.address ].generic++

      promises.push(
        proxyDnsRequest( req.address.family.toLowerCase(), question, res )
      )
    }
  })

  Promise
    .all( promises )
    .then( () => res.send() )
    .catch( err => console.log( err ) )
}

export default () => {
  const udp4Server = dns.createServer( { dgram_type: { type: 'udp4', reuseAddr: true } } ),
        udp6Server = dns.createServer( { dgram_type: { type: 'udp6', reuseAddr: true } } ),
        tcpServer  = dns.createTCPServer()
      /*urls = [],
      lineReader = readline.createInterface({
        input: fs.createReadStream('ads.list')
      })*/

  return Promise
    .resolve()
    .then(
      () => {
        return Promise.resolve()
        /*return new Promise (
          ( resolve, reject ) => {
            lineReader
              .on( 'line', function (line) {
                if ( line.startsWith( 'http' ) ) urls.push( line )
              })
              .on( 'close', function (){
                async.map( urls, parseHostsRecords, function ( err ) {
                  if ( err )
                    reject( err )
                  else
                    resolve()
                })
              })
          }
        )*/
      }
    )
    .then(
      () => {
        return new Promise (
          ( resolve, reject ) => {
            tcpServer
              .on( 'socketError', ( e ) => reject( `[DNS] TCP: ${e.message}` ) )
              .on( 'request', answerDnsRequest )
              .on( 'listening', () => {
                console.log( `>> DNS: Listening on [::]:53/tcp` )
                resolve()
              })
              .serve( global.zeroDns.dns.port )
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
              .on( 'request', answerDnsRequest )
              .on( 'listening', () => {
                console.log( `>> DNS: Listening on 0.0.0.0:53/udp` )
                resolve()
              })
              .serve( global.zeroDns.dns.port )
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
              .on( 'request', answerDnsRequest )
              .on( 'listening', () => {
                console.log( `>> DNS: Listening on [::]:53/udp` )
                resolve()
              })
              .serve( global.zeroDns.dns.port )
          }
        )
      }
    )
}