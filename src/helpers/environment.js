require('dotenv').config()

class Env {
  static isProduction () {
    return process.env.ENVIRONMENT === 'production'
  }

  static isDevelopment () {
    return process.env.ENVIRONMENT !== 'production'
  }
}

module.exports = Env
