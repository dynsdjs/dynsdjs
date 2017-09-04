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
      () => Dns()
    )
    .then(
      () => Api()
    )
    .catch( err => console.log( `ERROR: ${err}` ) )
}