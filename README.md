# dynsdjs
Dead-simple DNS Server Daemon written in NodeJS

# Features
- A fully functional IPv4/IPv6 DNS Server ( test it yourself with `dig -4` and `dig -6` )
- A fully functional REST API Web Server ( actually providing a single `/api` entrypoint, returning all the loaded domains and how many times were they hit )

# Installation
The Git way:
```bash
git clone https://github.com/julianxhokaxhiu/dynsdjs.git
cd dynsdjs
npm install
npm link # sudo may be required, depending on your environment config
dynsd # sudo is required to bind port 80 and 53
```

The Zip way:
```bash
wget https://github.com/julianxhokaxhiu/dynsdjs/archive/master.zip
unzip master.zip
cd dynsdjs-master
npm link # sudo may be required, depending on your environment config
dynsd # sudo is required to bind port 80 and 53
```

# Options
You can configure `dynsd` through Environment variables

- `HTTPPORT` for the HTTP service ( default is `80` )
- `DNSPORT` for the DNS service ( default is `53` )

## Example

```bash
$ HTTPPORT=8081 dynsd
```
See also [package.json](package.json#L17) as a real world example.

# API Schema

Whenever you will call the URL `http://localhost/api` you will be returned with a JSON answer like this

```js
{
  "clients": { // All the clients that did a request to this DNS
    "127.0.0.1": {
      "ads": 1, // How many AD domains this client tryed to lookup
      "generic": 2 // How many non-AD domains this client tryed to lookup
    }
  },
  "totalEntries": 105708, // How many AD domains entries does the server knows
  "totalHits": 3 // How many hits got the DNS system once it was running
}
```

# License

See [LICENSE](LICENSE)
