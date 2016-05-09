/**
The MIT License (MIT)

Copyright (c) 2016 Julian Xhokaxhiu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
**/

module.exports = function ( options ) {
  var async      = require( 'async' ),
      dns        = require( 'native-dns' ),                                                       // call dns server
      udp4Server = dns.createServer( { dgram_type: { type: 'udp4', reuseAddr: true } } ),         // create DNS server
      udp6Server = dns.createServer( { dgram_type: { type: 'udp6', reuseAddr: true } } ),         // create DNS server for IPv6 connections
      tcpServer  = dns.createTCPServer(),                                                         // create DNS server which listens on TCP connections
      ip         = require( 'ip' ),
      request    = require( 'request' ),
      parseHostsRecords = function ( url, cb ) {
        var lineReader = require('readline').createInterface({
              input: request( url )
            });

        try {
          lineReader
          .on( 'line', function (line) {
            if ( !line.startsWith( '#' ) ) {
              var host = line.split( /\s+/ ),
                  domain = '';

              if ( host.length < 2 )
                domain = host[0];
              else
                domain = host[1];

              options.cache
              .set( domain, { hit: 0 } );
            }
          })
          .on( 'close', function (){
            cb(null);
          })
        } catch ( ex ) {
          cb( ex );
        }
      },
      proxyDnsRequest = function ( dnsAlt, question, response, callback ) {
        var req = dns.Request({
          question: question, // forwarding the question
          server: { address: dnsAlt[ Math.round( Math.random() ) ], 'port': 53, 'type': 'udp' },  // this is the DNS server we are asking
          timeout: 1000
        });

        // when we get answers, append them to the response
        req.on('message', function (err, msg) {
          msg.answer.forEach( function ( a ) { response.answer.push(a) });
        });

        req.on('end', callback);
        req.send();
      }
      answerDnsRequest = function ( req, res ) {
        var f = [],
            ipType = req.address.family.toLowerCase(),
            dnsAlt = ( ipType == 'ipv6' ? options.resolver.ip6 : options.resolver.ip4 );

        if ( !( req.address.address in options.schema.clients ) ) {
          options.schema.clients[ req.address.address ] = {
            'ads': 0,
            'generic': 0
          }
        }

        req.question.forEach( function ( question ) {
          var adDomain = options.cache.get( question.name );

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

            options.schema.clients[ req.address.address ].ads++;

            options.cache.set( question.name, { hit: ++adDomain.hit } );
          } else {
            options.schema.clients[ req.address.address ].generic++;
            f.push( function ( cb ) { proxyDnsRequest( dnsAlt, question, res, cb ) });
          }
        });

        async.parallel(f, function() { res.send(); });
      },
      startDns = function () {
        // START THE DNS SERVER
        tcpServer.on( 'request', answerDnsRequest );
        udp4Server.on( 'request', answerDnsRequest );
        udp6Server.on( 'request', answerDnsRequest );
        tcpServer.serve( options.port );
        udp4Server.serve( options.port );
        udp6Server.serve( options.port );
        console.log( '>> DNS Port listening on: ' + options.port + ' [TCP/UDP]' );
        if ( options.ready ) options.ready();
      }

  // READ THE AD LIST
  var urls = [],
      lineReader = require('readline').createInterface({
        input: require('fs').createReadStream('ads.list')
      });

  lineReader
  .on( 'line', function (line) {
    if ( line.startsWith( 'http' ) )
      urls.push( line );

  })
  .on( 'close', function (){
    async.map( urls, parseHostsRecords, function ( err ) {
      if ( err ) { console.log( err ) }
      else startDns();
    });
  })
};