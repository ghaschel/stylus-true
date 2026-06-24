module.exports = function (options) {
  options = options || {};

  return function (style) {
    var stylus = require("stylus");
    var value = options.value || 0;

    style.define("cli-plugin-value", function () {
      return new stylus.nodes.Unit(value);
    });
  };
};
