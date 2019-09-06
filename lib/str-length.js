module.exports = function() {
  return function(stylus) {
    stylus.define("str-length", function() {
      if (!arguments || arguments.length > 1 || arguments.length === 0) {
        return "NOT_A_STRING";
      }
      const str = arguments[0];
      if (str.val) {
        return str.val.length;
      }

      return 0;
    });
  };
};
