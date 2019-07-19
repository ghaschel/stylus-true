var utils = require("stylus").utils;

module.exports = function() {
  return function(style) {
    style.define("unwrap", function() {
      return utils.unwrap(arguments[0].val);
    });
  };
};
