# dynsdjs
Dead-simple DNS Server Daemon written in NodeJS

# Features
- A fully functional IPv4/IPv6 DNS Server ( test it yourself with `dig -4` and `dig -6` ) listening on TCP/UDP
- A full plugin logic to extend the DNS with custom functionality ( see below for more details )

# Installation

You can install `dynsdjs` by simply running:

```shell
$ npm install -g dynsdjs
$ dynsd # sudo is required to bind port 80 and 53
```

# Development

```bash
$ git clone https://github.com/julianxhokaxhiu/dynsdjs.git
$ cd dynsdjs
$ npm install
$ npm link
$ dynsd # sudo is required to bind port 80 and 53
```

# Options
You can configure `dynsdjs` through Environment variables

- `DNSPORT` for the DNS service ( default is `53` )
- `DNSRESOURCES` to define a list of supported resources. Must be a string separated by comma.
  Default: `A,AAAA,NS,CNAME,PTR,NAPTR,TXT,MX,SRV,SOA,TLSA`

## DNS Resources

The parameter `DNSRESOURCES` will help you to either restrict or extend the functionalities of the DNS Server. Either because of security reasons or whatever. This functionality will be a heavy whitelist, when resolving an internal domain present in the list ( injected through the `init` event ).

So, if you for eg. set `DNSRESOURCES='A,AAAA'` ( like in the example down here ), this means that even if the plugins will return an extended entry with other resource records ( like MX, NS, etc. ) your DNS will answer only with A and AAAA records.

## Example

```bash
$ DNSPORT=5353 DNSRESOURCES='A,AAAA' dynsd
```
See also [package.json](package.json#L17) as a real world example.

## Plugins

You can extend this Daemon by creating a package that has a name that starts with `dynsdjs-plugin` prefix. In order to use it, it's just required to install it in the current `dynsdjs` folder. For eg.:

```
$ npm install -g dynsdjs-plugin-api
```

The plugin at this point will be run automatically on the next restart of the daemon

### API

In order to create a plugin, what you need is just to have a constructor that accepts as first argument the DNS daemon instance. For eg.:

```javascript
module.export = function ( dns ) {
    // `dns` is the daemon instance
}
```

You can use the daemon instance to listen for events that are emitted from it. At the current state there are three known events. An example would be:

```javascript
module.export = function ( dns ) {
    dns.on( 'init', function ( resolve, reject, data ) {
        console.log( 'Hello world!' );
      	resolve();
    })
}
```



#### init ( resolve, reject, data )

The `init` event is emitted as soon as the DNS daemon starts. The event gives tree arguments:

- **resolve:** a promise function that must be called if everything on the plugin side went well.
- **reject:** a promise function that must be called if something went wrong.
- **data.entries:** this object will hold the current entries present in the daemon. You can extend/manipulate it, as long as you prefer. This object is an instance of [node-cache](https://www.npmjs.com/package/node-cache), therefore see its API for more informations.

##### data.entries structure

The structure of every entry must be Dictionary where:

- **key** must be a resource type ( eg. `A`,`AAAA`,etc. )
- **value** a valid Dictionary, composed of the keys explained in [native-dns ResourceRecord](https://github.com/tjfontaine/node-dns#resourcerecord) documentation

This is an example of valid structure:

```json
{
  A: {
    name: 'awesomedomain.local',
    address: '0.0.0.0',
    ttl: 600
  },
  AAAA: {
    name: 'awesomedomain.local',
    address: '::',
    ttl: 600
  }
}
```

#### resolve.internal ( resolve, reject, data )

The `resolve.internal` event is emitted as soon as the DNS daemon hits an internal entry. The event gives you three arguments. See the next event for more informations.

#### resolve.external ( resolve, reject, data )

The `resolve.external` event is emitted as soon as the DNS daemon does not hit an internal entry, and goes therefore through external resolvers. The event gives you three arguments:

- **resolve:** a promise function that must be called if everything on the plugin side went well.
- **reject:** a promise function that must be called if something went wrong.
- **data.req:** an object representing the current request coming from the [native-dns](https://www.npmjs.com/package/native-dns) server instance.
- **data.res:** an object representing the current response object coming from the [native-dns](https://www.npmjs.com/package/native-dns) server instance.

### List of Plugins

A current list of plugins that are available can be found here:

- NPM: https://www.npmjs.com/search?q=dynsdjs-plugin
- Github: https://github.com/dynsdjs?q=dynsdjs-plugin

# License

See [LICENSE](LICENSE)
