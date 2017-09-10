import glob from 'glob'
import path from 'path'
import Dns from './dns'
import { name as packageName } from '../package.json'

export default () => {
  const dns = new Dns()

  // Load Plugins
  glob(
    `./node_modules/${packageName}-plugin-*`,
    ( err, files ) => {
        files
          .forEach(
            ( plugin ) => {
              plugin = path.basename( plugin )

              const instance = eval('require')( plugin )

              if ( instance && instance.default )
                new instance.default( dns )
              else if ( instance ) {
                new instance( dns )
              }
            }
          )

        // Finally start the DNS daemon
        dns.start()
    }
  )
}