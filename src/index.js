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

var Dns        = require( './modules/dns.js' ),
    Api        = require( './modules/api.js' ),
    NodeCache  = require( 'node-cache' ),
    dnsCache   = new NodeCache({ useClones: false }),
    apiSchema  = {
      'clients': {},
      'totalEntries': 0,
      'totalHits': 0
    }

console.log( '>> Fetching the latest entries from ads.list...' )

// Run the DNS Server
Dns({
  cache: dnsCache,
  schema: apiSchema,
  port: process.env.DNSPORT || 53,
  resolver: {
    ip4: [
      process.env.DNSALT1 || '8.8.8.8',
      process.env.DNSALT2 || '8.8.4.4'
    ],
    ip6: [
      process.env.DNS6ALT1 || '2001:4860:4860::8888',
      process.env.DNS6ALT1 || '2001:4860:4860::8844'
    ]
  },
  ready: function () {
    // Run the API + Static file server
    Api({
      cache: dnsCache,
      schema: apiSchema,
      port: process.env.HTTPPORT || 80,
      wwwPath: './www'
    });
  }
});