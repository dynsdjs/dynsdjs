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
      dnsServer  = dns.createServer( { dgram_type: { type: 'udp4', reuseAddr: true } } ),         // create DNS server
      dnsServer6 = dns.createServer( { dgram_type: { type: 'udp6', reuseAddr: true } } ),         // create DNS server for IPv6 connections
      ip         = require( 'ip' ),
      request    = require( 'request' ),
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


            options.cache.set( question.name, { count: ++adDomain.count } );
          } else
            f.push( function ( cb ) { proxyDnsRequest( dnsAlt, question, res, cb ) });
        });

        async.parallel(f, function() { res.send(); });
      },
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
              .set( domain, { count: 1 } );
            }
          })
          .on( 'close', function (){
            cb(null);
          })
        } catch ( ex ) {
          cb( ex );
        }
      },
      startDns = function () {
        // START THE DNS SERVER
        dnsServer.on( 'request', answerDnsRequest );
        dnsServer6.on( 'request', answerDnsRequest );
        dnsServer.serve( options.port );
        dnsServer6.serve( options.port );
        console.log( '>> DNS Port listening on: ' + options.port );
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