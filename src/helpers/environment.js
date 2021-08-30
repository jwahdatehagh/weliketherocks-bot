require('dotenv').config()

class Env {
  static isProduction () {
    return process.env.environment === 'production'
  }

  static isDevelopment () {
    return process.env.environment !== 'production'
  }
}

module.exports = Env
