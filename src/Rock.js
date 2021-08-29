const images = require('./helpers/rock-images')

class Rock {
  static imageFor (id) {
    return id >= 0 && id < 100
      ? `https://gateway.pinata.cloud/ipfs/${images[id]}`
      : undefined
  }

  static discordImageFor (id) {
    const image = Rock.imageFor(id)
    if (! image) return

    return {
      url: Rock.imageFor(id),
      width: 64,
      height: 64,
    }
  }
}

module.exports = Rock
