var utils = require('stylus').utils;

module.exports = function() {
  return function(style) {
    style.define('index-of', function(list, value) {
      list = utils.unwrap(list);
      value = value.first.val;

      for (var i = 0; i < list.nodes.length; i++) {
        if (value === list.nodes[i].val) {
          return i;
        }
      }

      return style.nodes.null;
    }, true);
  };
};
