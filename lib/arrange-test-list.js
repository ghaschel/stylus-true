var utils = require("stylus").utils;

module.exports = function() {
  return function(style) {
    style.define("arrange-test-list", function() {
      const list = [];
      let indexes = [];

      let prevIndx = null;
      let j = 0;

      for (var i = 0; i < arguments.length; ++i) {
        list.push(arguments[i]);
      }

      list.forEach((item, index) => {
        const hasTest = item.string.indexOf("test,") > -1;

        if (hasTest) {
          indexes.push(index);
        }
      });

      indexes.forEach((testIndex, index) => {
        const moving = list[testIndex + j];

        prevIndx = prevIndx ? prevIndx : 0;
        list.splice(prevIndx, 0, moving);

        j++;
        delete list[testIndex + j];
        prevIndx = testIndex + j;
      });

      const mod = list[list.length - 1];
      list.splice(0, 0, mod);
      delete list[list.length - 1];

      return utils.coerceArray(list);
    });
  };
};
