var utils = require('stylus').utils

module.exports = function() {
  return function(style) {
    style.define('map-keys', function(map) {
      const keys = Object.keys(map.vals)

      return utils.coerce(keys)
    })
  }
}
