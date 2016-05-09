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
  var express    = require( 'express' ),                                                   // call express
      app        = express(),                                                              // define our app using express
      bodyParser = require( 'body-parser' ),
      router     = express.Router();                                                       // get an instance of the express Router

  // configure app to use bodyParser()
  // this will let us get the data from a POST
  app.use( bodyParser.urlencoded( { extended: true } ) );
  app.use( bodyParser.json() );

  router.get( '/', function( req, res ) {
    options.cache.keys( function ( err, keys ){
      // Set it globally
      options.schema.totalEntries = keys.length;

      // Start the local response logic
      var ret = options.schema;

      keys.forEach( function ( key ){
        var o = options.cache.get( key );
        ret.totalHits += o.hit;
      })

      res.json( ret );
    })
  });

  // REGISTER OUR ROUTE -------------------------------
  // serve static files through the main url
  app.use( express.static( options.wwwPath ) );
  // /api will be the entry point to the REST API
  app.use( '/api', router );

  // START THE HTTP SERVER
  // =============================================================================
  app.listen( options.port );
  console.log( '>> HTTP Port listening on: ' + options.port );
};