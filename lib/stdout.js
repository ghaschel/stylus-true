module.exports = function() {
  return function(stylus) {
    stylus.define("stdout", function(str) {
      process.stdout.write(str + "\n");
    });
  };
};
