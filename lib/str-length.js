module.exports = function() {
  return function(stylus) {
    stylus.define("str-length", function(str) {
      if (str.val) {
        return str.val.length;
      }

      return 0;
    });
  };
};
