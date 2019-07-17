const chalk = require("chalk");

module.exports = function() {
  return function(stylus) {
    stylus.define("stdout", function() {
      const str = arguments[0];
      const type = arguments[1];

      if (!type) {
        process.stdout.write(`${str}\n`);
      }

      if (type === "debug") {
        process.stdout.write(
          `${chalk.hex("#333333").bold.bgKeyword("orange")(" DEBUG ")} ${str}\n`
        );
      }

      if (type === "warn") {
        process.stdout.write(
          `${chalk.hex("#000000").bold.bgKeyword("yellow")(" WARN ")} ${str}\n`
        );
      }

      if (type === "warn") {
        process.stdout.write(
          `${chalk.hex("#000000").bold.bgKeyword("red")(" ERROR ")} ${str}\n`
        );
      }
    });
  };
};
