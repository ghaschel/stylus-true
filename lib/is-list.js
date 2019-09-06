var utils = require("stylus").utils;

module.exports = function() {
  return function(style) {
    style.define("is-lists", function(map) {
      console.log(arguments);
    });
  };
};
