import { exec } from 'child_process'
import glob from 'glob'
import path from 'path'
import Dns from './dns'
import { name as packageName } from '../package.json'

const dns = new Dns()
let plugins = []

function getNodeModulesPath( isGlobal ) {
  return new Promise (
    ( resolve, reject ) => {
      if ( isGlobal )
        exec(
          `npm config get prefix -g`,
          ( err, stdout, stderr ) => {
            if ( err ) reject( err )
            else if ( stderr ) reject ( stderr )
            else resolve( stdout )
          }
        )
      else
        resolve(
          `${path.resolve()}/node_modules`
        )
    }
  )
}

function loadPlugins( pluginPath ) {
  return new Promise (
    ( resolve, reject ) => {
      // Load Plugins
      glob(
        `${pluginPath}/${packageName}-plugin-*`,
        ( err, files ) => {
            if ( err ) reject( err )
            else {
              files
                .forEach(
                  ( plugin ) => {
                    plugin = path.basename( plugin )

                    const instance = eval('require')( plugin )

                    // Avoid loading twice a plugin, if it's already loaded
                    if ( instance && !(plugin in plugins) ) {
                      plugins[ plugin ] = true

                      if ( instance.default )
                        new instance.default( dns )
                      else if ( instance )
                        new instance( dns )
                    }
                  }
                )

              // Finally resolve
              resolve()
            }
        }
      )
    }
  )
}

export default () => {
  Promise.resolve()
    .catch( err => console.log( err ) )
    // Load global plugins
    .then( () => getNodeModulesPath( /*isGlobal:*/ true ) )
    .then( path => loadPlugins( path ) )
    // Load local plugins
    .then( () => getNodeModulesPath() )
    .then( path => loadPlugins( path ) )
    // Start the DNS
    .then( () => dns.start() )
}