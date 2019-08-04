var utils = require("stylus").utils;

module.exports = function() {
  return function(style) {
    style.define("copy", function(a) {
      const copy = JSON.parse(JSON.stringify(a));
      return a;
    });
  };
};
