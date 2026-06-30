"use strict";
const stylus = require("stylus");
const utils = stylus.utils;
const unwrap = function () {
    return function (style) {
        style.define("unwrap", function (...args) {
            return utils.unwrap(args[0]);
        });
    };
};
module.exports = unwrap;
