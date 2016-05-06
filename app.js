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

var async      = require( 'async' ),
    express    = require( 'express' ),                                                   // call express
    app        = express(),                                                              // define our app using express
    bodyParser = require( 'body-parser' ),
    dns        = require( 'native-dns' ),                                                // call dns server
    dnsServer  = dns.createServer( { dgram_type: { type: 'udp4', reuseAddr: true } } ),  // create DNS server
    dnsServer6 = dns.createServer( { dgram_type: { type: 'udp6', reuseAddr: true } } ),  // create DNS server for IPv6 connections
    NodeCache  = require( 'node-cache' ),
    ip         = require( 'ip' ),
    dnsCache   = new NodeCache(),                                                        // define our dns cache handler,
    router     = express.Router(),                                                       // get an instance of the express Router
    httpPort   = process.env.HTTPPORT || 80,                                             // set our HTTP port
    dnsPort    = process.env.DNSPORT || 53,                                              // set out DNS server port
    altDns     = [
      process.env.DNSALT1 || '8.8.8.8',
      process.env.DNSALT2 || '8.8.4.4'
    ],
    altDns6    = [
      process.env.DNS6ALT1 || '2001:4860:4860::8888',
      process.env.DNS6ALT1 || '2001:4860:4860::8844'
    ],
    proxyDnsRequest = function ( dnsAlt, question, response, callback ) {
      var request = dns.Request({
        question: question, // forwarding the question
        server: { address: dnsAlt[ Math.round( Math.random() ) ], 'port': 53, 'type': 'udp' },  // this is the DNS server we are asking
        timeout: 1000
      });

      // when we get answers, append them to the response
      request.on('message', function (err, msg) {
        msg.answer.forEach( function ( a ) { response.answer.push(a) });
      });

      request.on('end', callback);
      request.send();
    }
    answerDnsRequest = function ( req, res ) {
      var f = [],
          ipType = req.address.family.toLowerCase(),
          dnsAlt = ( ipType == 'ipv6' ? altDns6 : altDns ),
          ret = ip.address( 'private', ipType );

      req.question.forEach( function ( question ) {
        if ( question.name == 'test.lan' ) {
          res
          .answer
          .push(
            dns.A({
              name: 'test.lan',
              address: ret,
              ttl: 600
            })
          )
        } else
          f.push( function ( cb ) { proxyDnsRequest( dnsAlt, question, res, cb ) });
      });

      async.parallel(f, function() { res.send(); });
    }

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json() );

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get( '/', function( req, res ) {
    res.json( { message: 'hooray! welcome to our api!' } );
});

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// serve static files through the main url
app.use( express.static( 'www' ) );
// all of our routes will be prefixed with /api
app.use( '/api', router );

// START THE HTTP SERVER
// =============================================================================
app.listen( httpPort );
console.log( '>> HTTP Port listening on: ' + httpPort );

// START THE DNS SERVER
dnsServer.on( 'request', answerDnsRequest );
dnsServer6.on( 'request', answerDnsRequest );
dnsServer.serve( dnsPort );
dnsServer6.serve( dnsPort );
console.log( '>> DNS Port listening on: ' + dnsPort );