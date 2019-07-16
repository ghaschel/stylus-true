var utils = require("stylus").utils;

module.exports = function() {
  return function(style) {
    style.define("fix-array-order", function(hash) {
      console.log(utils.unwrap(hash.vals.buffer));
      return hash;
    });
  };
};

// let indexes = [];
// lista.forEach((item, index) => {
//   const hasTest = item.indexOf('test,') > -1;
//   const hasModule = item.indexOf('module,') > -1;
//   if (hasTest || hasModule) indexes.push(index);
// });
// tmp, tmp2, tmp3;
// indexes.forEach((el, index) => {
//   if (index === 0) {
//     tmp = lista[0];
//     tmp3 = lista[indexes[indexes.length - 1]];
//     console.log(tmp3);

//     lista[0] = tmp3;
//   } else {
//     tmp2 = lista[el];
//     lista[el] = tmp;
//     tmp = tmp2;
//     tmp2 = lista[indexes[index + 1]];
//   }
// });
