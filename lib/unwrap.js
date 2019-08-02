var utils = require("stylus").utils;

module.exports = function() {
  return function(style) {
    style.define("unwrap", function() {
      console.log;
      return utils.unwrap(arguments[0]);
    });
  };
};
