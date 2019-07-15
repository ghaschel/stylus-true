var utils = require("stylus").utils;

module.exports = function() {
  return function(style) {
    style.define("unwrap", function(expr) {
      const val = utils.unwrap(expr);

      return val;
    });
  };
};
