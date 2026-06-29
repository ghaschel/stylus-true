"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const chalk_1 = __importDefault(require("chalk"));
const stylusNodeToString = function (node) {
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
const stdout = function () {
    return function (style) {
        style.define("stdout", function (message, messageType) {
            const str = stylusNodeToString(message);
            const type = stylusNodeToString(messageType);
            if (!type) {
                process.stdout.write(`${str}\n`);
            }
            else if (type === "debug") {
                process.stdout.write(`${chalk_1.default.hex("#333333").bold.bgBlue(" DEBUG ")} ${str}\n`);
            }
            else if (type === "warn") {
                process.stdout.write(`${chalk_1.default.hex("#000000").bold.bgYellow(" WARN ")} ${str}\n`);
            }
            else if (type === "error") {
                process.stdout.write(`${chalk_1.default.hex("#000000").bold.bgRed(" ERROR ")} ${str}\n`);
            }
        });
    };
};
module.exports = stdout;
