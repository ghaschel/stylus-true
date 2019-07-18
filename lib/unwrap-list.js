var utils = require("stylus").utils;

module.exports = function() {
  return function(style) {
    style.define("unwrap-list", function() {
      const arg = [];

      for (var i = 0; i < arguments.length; ++i) {
        arg.push(utils.coerce(arguments[i].val));
      }

      return utils.coerceArray(arg);
    });
  };
};
