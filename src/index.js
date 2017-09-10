import Api from './modules/api'
import Dns from './modules/dns'

export default () => {
  const dns = new Dns()

  // Load Plugins
  new Api( dns )

  dns.start()
}