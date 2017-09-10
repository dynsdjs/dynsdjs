# dynsdjs
Dead-simple DNS Server Daemon written in NodeJS

# Features
- A fully functional IPv4/IPv6 DNS Server ( test it yourself with `dig -4` and `dig -6` ) listening on TCP/UDP
- A full plugin logic to extend the DNS with custom functionality ( see below for more details )

# Installation
The Git way:
```bash
$ git clone https://github.com/julianxhokaxhiu/dynsdjs.git
$ cd dynsdjs
$ npm install
$ npm run start # sudo is required to bind port 80 and 53
```

The Zip way:
```bash
$ wget https://github.com/julianxhokaxhiu/dynsdjs/archive/master.zip
$ unzip master.zip
$ cd dynsdjs-master
$ npm install
$ npm run start # sudo is required to bind port 80 and 53
```

# Options
You can configure `dynsdjs` through Environment variables

- `DNSPORT` for the DNS service ( default is `53` )

## Example

```bash
$ DNSPORT=5353 dynsd
```
See also [package.json](package.json#L17) as a real world example.

## Plugins

You can extend this Daemon by creating a package that has a name that starts with `dynsdjs-plugin` prefix. In order to use it, it's just required to install it in the current `dynsdjs` folder. For eg.:

```
$ npm install dynsdjs-plugin-api
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
