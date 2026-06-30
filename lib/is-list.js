"use strict";
const isList = function () {
    return function (style) {
        style.define("is-lists", function () {
            console.log(arguments);
        });
    };
};
module.exports = isList;
