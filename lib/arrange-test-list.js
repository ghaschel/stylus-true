"use strict";
const stylus = require("stylus");
const utils = stylus.utils;
const arrangeTestList = function () {
    return function (style) {
        style.define("arrange-test-list", function (...items) {
            const list = items.slice();
            const indexes = [];
            let previousIndex = null;
            let offset = 0;
            list.forEach((item, index) => {
                const hasTest = typeof item.string === "string" && item.string.indexOf("test,") > -1;
                if (hasTest) {
                    indexes.push(index);
                }
            });
            indexes.forEach((testIndex) => {
                const moving = list[testIndex + offset];
                previousIndex = previousIndex || 0;
                list.splice(previousIndex, 0, moving);
                offset++;
                delete list[testIndex + offset];
                previousIndex = testIndex + offset;
            });
            const moduleNode = list[list.length - 1];
            list.splice(0, 0, moduleNode);
            delete list[list.length - 1];
            return utils.coerceArray(list);
        });
    };
};
module.exports = arrangeTestList;
