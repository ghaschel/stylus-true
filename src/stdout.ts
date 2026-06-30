import chalk from "chalk";
import type { StylusPlugin } from "./types/stylus-interop";

const stylusNodeToString = function (node: any): string {
  if (node == null) {
    return "";
  }

  if (typeof node === "string") {
    return node;
  }

  if (typeof node.string === "string") {
    return node.string;
  }

  if (typeof node.val === "string") {
    return node.val;
  }

  return String(node);
};

const stdout = function (): StylusPlugin {
  return function (style) {
    style.define("stdout", function (message: any, messageType: any) {
      const str = stylusNodeToString(message);
      const type = stylusNodeToString(messageType);

      if (!type) {
        process.stdout.write(`${str}\n`);
      } else if (type === "debug") {
        process.stdout.write(
          `${chalk.hex("#333333").bold.bgBlue(" DEBUG ")} ${str}\n`
        );
      } else if (type === "warn") {
        process.stdout.write(
          `${chalk.hex("#000000").bold.bgYellow(" WARN ")} ${str}\n`
        );
      } else if (type === "error") {
        process.stdout.write(
          `${chalk.hex("#000000").bold.bgRed(" ERROR ")} ${str}\n`
        );
      }
    });
  };
};

export = stdout;
