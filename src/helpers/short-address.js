const shortAddress = address => (
  address.substr(0, 6) +
  '...' +
  address.substr(address.length - 4, 4)
)

module.exports = shortAddress
