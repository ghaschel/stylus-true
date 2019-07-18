var utils = require("stylus").utils;

module.exports = function() {
  return function(style) {
    style.define("dynamic-hash", function(arg1, arg2, arg3) {
      const hash = utils.unwrap(arguments[0]).vals;
      const type = utils.unwrap(arguments[1]).val;
      const value = utils.unwrap(arguments[2]).val;

      hash[type] = value;

      return utils.coerce(hash);
    });
  };
};
