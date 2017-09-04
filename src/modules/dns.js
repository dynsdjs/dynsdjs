import async from 'async'
import dns from 'native-dns'
import fs from 'fs'
import ip from 'ip'
import readline from 'readline'
import request from 'request'

function parseHostsRecords ( url, cb ) {
  var lineReader = readline.createInterface({
        input: request( url )
      })

  try {
    lineReader
    .on( 'line', function (line) {
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
    })
    .on( 'close', function (){
      cb(null)
    })
  } catch ( ex ) {
    cb( ex )
  }
}

function proxyDnsRequest ( dnsAlt, question, response, callback ) {
  var req = dns.Request({
    question: question, // forwarding the question
    server: { address: dnsAlt[ Math.round( Math.random() ) ], 'port': 53, 'type': 'udp' },  // this is the DNS server we are asking
    timeout: 1000
  })

  // when we get answers, append them to the response
  req.on('message', function (err, msg) {
    msg.answer.forEach( function ( a ) { response.answer.push(a) })
  })

  req.on('end', callback)
  req.send()
}

function answerDnsRequest ( req, res ) {
  var f = [],
      ipType = req.address.family.toLowerCase(),
      dnsAlt = ( ipType == 'ipv6' ? global.zeroDns.dns.resolver.ip6 : global.zeroDns.dns.resolver.ip4 )

  if ( !( req.address.address in global.zeroDns.http.stats.clients ) ) {
    global.zeroDns.http.stats.clients[ req.address.address ] = {
      'ads': 0,
      'generic': 0
    }
  }

  req.question.forEach( function ( question ) {
    var adDomain = global.zeroDns.dns.cache.get( question.name )

    if ( adDomain ) {
      res
      .answer
      .push(
        dns.A({
          name: question.name,
          address: ip.address( 'public', 'ipv4' ),
          ttl: 600
        })
      )

      res
      .answer
      .push(
        dns.AAAA({
          name: question.name,
          address: ip.address( 'public', 'ipv6' ),
          ttl: 600
        })
      )

      global.zeroDns.http.stats.clients[ req.address.address ].ads++

      global.zeroDns.dns.cache.set( question.name, { hit: ++adDomain.hit } )
    } else {
      global.zeroDns.http.stats.clients[ req.address.address ].generic++
      f.push( function ( cb ) { proxyDnsRequest( dnsAlt, question, res, cb ) })
    }
  })

  async.parallel(f, function() { res.send() })
}

export default () => {
  var udp4Server = dns.createServer( { dgram_type: { type: 'udp4', reuseAddr: true } } ),         // create DNS server
      udp6Server = dns.createServer( { dgram_type: { type: 'udp6', reuseAddr: true } } ),         // create DNS server for IPv6 connections
      tcpServer  = dns.createTCPServer(),                                                         // create DNS server which listens on TCP connections
      urls = [],
      lineReader = readline.createInterface({
        input: fs.createReadStream('ads.list')
      })

  return Promise
    .resolve()
    .then(
      () => {
        return new Promise (
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
        )
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