var utils = require('stylus').utils

module.exports = function() {
  return function(style) {
    style.define('dynamic-hash', function(hash, key, value) {
      const stylNull = utils.coerce(null)
      let varKey
      let varVal

      // if (stylNull.operate('==', key).val) {
      //   varKey = null
      // } else {
      //   varKey =
      //     typeof key.val === 'string' ? key.val.replace(/\'/g, '') : key.val
      // }

      // if (stylNull.operate('==', value).val) {
      //   varVal = null
      // } else {
      //   varVal =
      //     typeof value.val === 'string'
      //       ? value.val.replace(/\'/g, '')
      //       : value.val
      // }

      const teste = {}
      teste[varKey] = varVal

      return utils.coerce(utils.merge(hash, teste))
    })
  }
}
