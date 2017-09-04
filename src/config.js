import NodeCache from 'node-cache'

export default function Config () {
  return new Promise(
    ( resolve, reject ) => {
      global.zeroDns = {
        dns: {
          cache: new NodeCache({ useClones: false }),
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
          }
        },
        http: {
          stats: {
            'clients': {},
            'totalEntries': 0,
            'totalHits': 0
          },
          port: process.env.HTTPPORT || 80
        }
      }

      resolve()
    }
  )
}