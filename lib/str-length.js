module.exports = function() {
  return function(stylus) {
    stylus.define('str-length', function(str) {
      console.log(str.args.nodes[0].nodes[0].nodes)
      if (str.val) {
        return str.val.length
      }

      return 0
    })
  }
}
