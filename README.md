# zeroads
DNS Server + REST API + Web Client all bundled in a single Node.js application

# What is this project?
Inspired by [pi-hole](https://pi-hole.net/), my goal was to reproduce the same idea using only NodeJS as a single platform. No third-party dependencies, no additional packages to be installed, no smashing-head configurations to play with. One single line to write on your CLI and you're good to go!

# What does it features?
- A fully functional IPv4/IPv6 DNS Server ( test it yourself with `dig -4` and `dig -6` )
- A fully functional REST API Web Server ( actually providing a single `/api` entrypoint, returning all the loaded domains and how many times were they hit )
- A fully functional Static Web Server ( this is where the Web Client will live, but will be served from this same application, no need for an external HTTP server like Apache or Nginx )

# How can I install it and/or get it up and running?
Very simple!

The Git way:
```bash
git clone https://github.com/julianxhokaxhiu/zeroads.git
cd zeroads
npm install
sudo npm run-script live # sudo is required to bind port 80 and 53
```

The Zip way:
```bash
wget https://github.com/julianxhokaxhiu/zeroads/archive/master.zip
unzip master.zip
cd zeroads-master
npm install
sudo npm run-script live # sudo is required to bind port 80 and 53
```

# Any option available?
Sure! Environment variables are your friend :)

- `HTTPPORT` for the HTTP service ( `default=80` )
- `DNSPORT` for the DNS service ( `default=53` )

# ...and how to use them?
```bash
$ HTTPPORT=8081 node app.js
```
There's a real working example inside the [package.json](package.json#L14) too!

# What about the license?
This is a fully free, and open source project. See [LICENSE](LICENSE)

# I like this project, can I Donate?
Unfortunately not, just because I believe that Open Source projects should find a way to auto-found themselfs. Although you're truly welcome to contribute here on the code :) Feel free to fork this project and create Pull Requests!

# Any roadmap?
Sure! This project is really in pre-alpha, but in it's way is already working. Anyway this is the main idea:
- 0.1: Initial release (mostly a concept to get everything technically there, up and running )
- 0.2: A better API mapping over the service
- 0.3: A Web GUI to see those statistics on the browser
- 0.4: Code refactoring and/or optimizations where possible ( `harder better faster stronger ♪` )
- 0.5..0.9: Rainbows and Unicorns
- 1.0: Final consumer version. ready for Donkeys :)

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

Please remember that this Schema is still **Work In Progress**!