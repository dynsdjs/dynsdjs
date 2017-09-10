import Dns from './modules/dns'
import Api from './modules/api'
import Config from './config'

export default () => {
  Promise
    .resolve()
    .then(
      () => Config()
    )
    .then(
      ( config ) => Dns( config )
    )
    .then(
      ( config ) => Api( config )
    )
    .catch( err => console.log( `ERROR: ${err}` ) )
}