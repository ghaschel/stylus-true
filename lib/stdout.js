"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const chalk_1 = __importDefault(require("chalk"));
const stdout = function () {
    return function (style) {
        style.define("stdout", function (...args) {
            const str = args[0];
            const type = args[1];
            if (!type) {
                process.stdout.write(`${str}\n`);
            }
            if (type === "debug") {
                process.stdout.write(`${chalk_1.default.hex("#333333").bold.bgBlue(" DEBUG ")} ${str}\n`);
            }
            if (type === "warn") {
                process.stdout.write(`${chalk_1.default.hex("#000000").bold.bgYellow(" WARN ")} ${str}\n`);
            }
            if (type === "error") {
                process.stdout.write(`${chalk_1.default.hex("#000000").bold.bgRed(" ERROR ")} ${str}\n`);
            }
        });
    };
};
module.exports = stdout;
