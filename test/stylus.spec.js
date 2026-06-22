const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const stylTrue = require("../lib/main.js");
const glob = require("glob");
const stylus = require("stylus");

const removeDir = (dir) => {
  if (!fs.existsSync(dir)) {
    return;
  }

  fs.readdirSync(dir).forEach((file) => {
    const current = path.join(dir, file);
    const stat = fs.lstatSync(current);

    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      removeDir(current);
    } else {
      fs.unlinkSync(current);
    }
  });

  fs.rmdirSync(dir);
};

describe("stylus-true", () => {
  const stylTestFiles = glob.sync(
    path.resolve(process.cwd(), "test/styl/test.styl")
  );

  stylTestFiles.forEach((file) => stylTrue.runStyl({ file }, { describe, it }));
});

describe("stylus interface", () => {
  it("resolves internal plugin paths from a consuming project", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stylus-true-consumer-"));

    try {
      const nodeModules = path.join(tmp, "node_modules");
      const packagePath = path.resolve(__dirname, "..");
      const testFile = path.join(tmp, "test.styl");
      const stylusSource = [
        '@require "node_modules/stylus-true/styl/_true.styl";',
        "+test-module('Module') {",
        "  +test('Test') {",
        "    assert-equal(1, 1);",
        "  }",
        "}",
      ].join("\n");

      fs.mkdirSync(nodeModules);
      fs.symlinkSync(packagePath, path.join(nodeModules, "stylus-true"), "dir");
      fs.writeFileSync(testFile, stylusSource);

      const css = stylus.render(fs.readFileSync(testFile, "utf8"), {
        filename: testFile,
      });

      assert(css.indexOf("/* # Module: Module */") !== -1, css);
      assert(css.indexOf("/* Test: 'Test' */") !== -1, css);
      assert(css.indexOf("/*   ✔ [assert-equal] */") !== -1, css);
    } finally {
      removeDir(tmp);
    }
  });
});
