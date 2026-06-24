var stylus = require("stylus");
var nodes = stylus.nodes;
var utils = stylus.utils;

module.exports = function () {
  return function (style) {
    style.define("true-json-equal", function (actual, expected) {
      return new nodes.Boolean(
        deepEqual(normalize(actual), normalize(expected))
      );
    });
  };
};

function normalize(node) {
  node = utils.unwrap(node);

  if (!node) {
    return { type: "undefined" };
  }

  if (node.nodeName === "expression") {
    if (!node.isList && node.nodes.length === 1) {
      return normalize(node.nodes[0]);
    }

    return {
      type: "expression",
      isList: Boolean(node.isList),
      nodes: node.nodes.map(normalize),
    };
  }

  if (node.nodeName === "object") {
    var keys = Object.keys(node.vals).sort();
    var value = {};

    keys.forEach(function (key) {
      value[key] = normalize(node.vals[key]);
    });

    return {
      type: "object",
      value: value,
    };
  }

  if (node.nodeName === "unit") {
    return {
      type: "unit",
      value: node.val,
      unit: node.type || "",
    };
  }

  if (node.nodeName === "string") {
    return {
      type: "string",
      value: node.val,
    };
  }

  if (node.nodeName === "ident") {
    return {
      type: "ident",
      value: node.name,
    };
  }

  if (node.nodeName === "boolean") {
    return {
      type: "boolean",
      value: node.isTrue,
    };
  }

  if (node.nodeName === "null") {
    return {
      type: "null",
      value: null,
    };
  }

  return {
    type: node.nodeName,
    value: node.toString(),
  };
}

function deepEqual(left, right) {
  if (left === right) {
    return true;
  }

  if (!left || !right || left.type !== right.type) {
    return false;
  }

  if (Array.isArray(left.nodes) || Array.isArray(right.nodes)) {
    return (
      left.isList === right.isList &&
      Array.isArray(left.nodes) &&
      Array.isArray(right.nodes) &&
      equalArrays(left.nodes, right.nodes)
    );
  }

  if (left.type === "object") {
    var leftKeys = Object.keys(left.value);
    var rightKeys = Object.keys(right.value);

    return (
      equalArrays(leftKeys, rightKeys) &&
      leftKeys.every(function (key) {
        return deepEqual(left.value[key], right.value[key]);
      })
    );
  }

  return left.value === right.value && left.unit === right.unit;
}

function equalArrays(left, right) {
  return (
    left.length === right.length &&
    left.every(function (item, index) {
      return typeof item === "string"
        ? item === right[index]
        : deepEqual(item, right[index]);
    })
  );
}
