import NodeCache from 'node-cache'

export default () => {
  return new Promise(
    ( resolve, reject ) => {
      const config = {
        dns: {
          cache: new NodeCache({ useClones: false }),
          port: process.env.DNSPORT || 53,
          resolver: {
            ipv4: [
              process.env.DNSALT1 || '8.8.8.8',
              process.env.DNSALT2 || '8.8.4.4'
            ],
            ipv6: [
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

      resolve( config )
    }
  )
}