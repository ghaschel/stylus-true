import chalk = require("chalk");
import type { StylusPlugin } from "./types/stylus-interop";

const stdout = function (): StylusPlugin {
  return function (style) {
    style.define("stdout", function (...args: any[]) {
      const str = args[0];
      const type = args[1];

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

      if (type === "error") {
        process.stdout.write(
          `${chalk.hex("#000000").bold.bgKeyword("red")(" ERROR ")} ${str}\n`
        );
      }
    });
  };
};

export = stdout;
