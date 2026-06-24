const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const stylTrue = require("../lib/main.js");
const glob = require("glob");
const stylus = require("stylus");

const packagePath = path.resolve(__dirname, "..");
const packageStylPath = path.join(packagePath, "styl");
const passingCss = [
  "/* # Module: Options */",
  "/* ----------------- */",
  "/* Test: render options */",
  "/*   ✔ [assert-equal] */",
  "/*  */",
].join("\n");

const createRunner = () => {
  const calls = [];

  return {
    calls,
    describe(name, cb) {
      calls.push(["describe", name]);
      cb();
    },
    it(name, cb) {
      calls.push(["it", name]);
      cb();
    },
  };
};

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

const testSource = (moduleName, testName, assertion) =>
  [
    '@require "styl/_true";',
    `+test-module('${moduleName}') {`,
    `  +test('${testName}') {`,
    `    ${assertion}`,
    "  }",
    "}",
  ].join("\n");

describe("stylus-true", () => {
  const stylTestFiles = glob.sync(
    path.resolve(process.cwd(), "test/styl/test.styl")
  );

  stylTestFiles.forEach((file) => stylTrue.runStyl({ file }, { describe, it }));
});

describe("runStyl compatibility", () => {
  it("passes normalized options for file renders", () => {
    const runner = createRunner();
    const file = path.resolve(__dirname, "styl/test.styl");
    const includePath = path.resolve(__dirname, "styl/includes");
    const nativePath = path.resolve(__dirname, "styl");
    const includePaths = [includePath];
    const paths = [nativePath];
    let renderContents;
    let renderOptions;

    stylTrue.runStyl(
      {
        file,
        includePaths,
        paths,
        compress: true,
      },
      {
        describe: runner.describe,
        it: runner.it,
        styl: {
          render(contents, options) {
            renderContents = contents;
            renderOptions = options;
            return passingCss;
          },
        },
      }
    );

    assert(renderContents.indexOf("@import 'styl/_true.styl';") !== -1);
    assert.strictEqual(renderOptions.filename, file);
    assert.strictEqual(renderOptions.compress, true);
    assert.deepStrictEqual(includePaths, [includePath]);
    assert.deepStrictEqual(paths, [nativePath]);
    assert.deepStrictEqual(renderOptions.includePaths, [
      includePath,
      packagePath,
      packageStylPath,
    ]);
    assert.deepStrictEqual(renderOptions.paths, [
      nativePath,
      includePath,
      packagePath,
      packageStylPath,
    ]);
    assert.deepStrictEqual(runner.calls, [
      ["describe", "Options"],
      ["it", "render options"],
    ]);
  });

  it("passes normalized options for data renders", () => {
    const runner = createRunner();
    const filename = path.resolve(__dirname, "inline.styl");
    let renderContents;
    let renderOptions;

    stylTrue.runStyl(
      {
        data: testSource("Inline", "uses data", "assert-equal(1, 1);"),
        filename,
      },
      {
        describe: runner.describe,
        it: runner.it,
        styl: {
          render(contents, options) {
            renderContents = contents;
            renderOptions = options;
            return passingCss;
          },
        },
      }
    );

    assert(renderContents.indexOf("+test-module('Inline')") !== -1);
    assert.strictEqual(renderOptions.filename, filename);
    assert.deepStrictEqual(renderOptions.paths, [packagePath, packageStylPath]);
  });

  it("renders data requiring styl/_true through package lookup paths", () => {
    const runner = createRunner();

    stylTrue.runStyl(
      {
        data: testSource("Data", "loads package entry", "assert-equal(1, 1);"),
      },
      {
        describe: runner.describe,
        it: runner.it,
      }
    );

    assert.deepStrictEqual(runner.calls, [
      ["describe", "Data"],
      ["it", "'loads package entry'"],
    ]);
  });

  it("supports includePaths as a compatibility alias", () => {
    const runner = createRunner();
    const includePath = path.resolve(__dirname, "styl/includes");
    const source = [
      '@require "styl/_true";',
      '@require "_mixin";',
      "+test-module('IncludePaths') {",
      "  +test('imports user fixtures') {",
      "    +assert('included mixin output') {",
      "      +output() {",
      "        included-mixin();",
      "      }",
      "      +expect() {",
      "        -property: value;",
      "      }",
      "    }",
      "  }",
      "}",
    ].join("\n");

    stylTrue.runStyl(
      {
        data: source,
        includePaths: [includePath],
      },
      {
        describe: runner.describe,
        it: runner.it,
      }
    );

    assert.deepStrictEqual(runner.calls, [
      ["describe", "IncludePaths"],
      ["it", "'imports user fixtures'"],
    ]);
  });

  it("supports native Stylus paths", () => {
    const runner = createRunner();
    const includePath = path.resolve(__dirname, "styl/includes");
    const source = [
      '@require "styl/_true";',
      '@require "_mixin";',
      "+test-module('Paths') {",
      "  +test('imports user fixtures') {",
      "    +assert('included mixin output') {",
      "      +output() {",
      "        included-mixin();",
      "      }",
      "      +expect() {",
      "        -property: value;",
      "      }",
      "    }",
      "  }",
      "}",
    ].join("\n");

    stylTrue.runStyl(
      {
        data: source,
        paths: [includePath],
      },
      {
        describe: runner.describe,
        it: runner.it,
      }
    );

    assert.deepStrictEqual(runner.calls, [
      ["describe", "Paths"],
      ["it", "'imports user fixtures'"],
    ]);
  });

  it("passes use plugins through to Stylus", () => {
    const runner = createRunner();
    const plugin = (style) => {
      style.define("plugin-value", () => new stylus.nodes.Unit(42));
    };

    stylTrue.runStyl(
      {
        data: testSource(
          "Use Plugin",
          "uses plugin functions",
          "assert-equal(plugin-value(), 42);"
        ),
        use: plugin,
      },
      {
        describe: runner.describe,
        it: runner.it,
      }
    );

    assert.deepStrictEqual(runner.calls, [
      ["describe", "Use Plugin"],
      ["it", "'uses plugin functions'"],
    ]);
  });
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

  it("throws uncaught true-error calls through Stylus", () => {
    const source = [
      '@require "styl/_true";',
      'true-error("hard failure", "error api");',
    ].join("\n");

    assert.throws(
      () =>
        stylus.render(source, {
          paths: [packagePath, packageStylPath],
        }),
      /hard failure/
    );
  });

  it("warns and catches true-error when catch mode is warn", () => {
    const source = [
      '@require "styl/_true";',
      "$catch-errors.value = 'warn';",
      ".probe {",
      '  value: true-error("soft failure", "error api");',
      "}",
    ].join("\n");
    const warnings = [];
    const originalWarn = console.warn;

    console.warn = function () {
      warnings.push(Array.prototype.slice.call(arguments).join(" "));
    };

    try {
      const css = stylus.render(source, {
        paths: [packagePath, packageStylPath],
      });

      assert(css.indexOf("ERROR [error api]: soft failure") !== -1);
      assert(
        warnings.some((warning) => warning.indexOf("soft failure") !== -1)
      );
    } finally {
      console.warn = originalWarn;
    }
  });

  it("supports scalar catch-errors assignment", () => {
    const source = [
      '@require "styl/_true";',
      "$catch-errors = true;",
      ".probe {",
      '  value: true-error("scalar failure");',
      "}",
    ].join("\n");
    const css = stylus.render(source, {
      paths: [packagePath, packageStylPath],
    });

    assert(css.indexOf("ERROR: scalar failure") !== -1);
  });

  it("warns and catches true-error when catch mode is unquoted warn", () => {
    const source = [
      '@require "styl/_true";',
      "$catch-errors.value = warn;",
      ".probe {",
      '  value: true-error("unquoted warning", "error api");',
      "}",
    ].join("\n");
    const warnings = [];
    const originalWarn = console.warn;

    console.warn = function () {
      warnings.push(Array.prototype.slice.call(arguments).join(" "));
    };

    try {
      const css = stylus.render(source, {
        paths: [packagePath, packageStylPath],
      });

      assert(css.indexOf("ERROR [error api]: unquoted warning") !== -1);
      assert(
        warnings.some((warning) => warning.indexOf("unquoted warning") !== -1)
      );
    } finally {
      console.warn = originalWarn;
    }
  });

  it("outputs no-source caught true-error mixin comments", () => {
    const source = [
      '@require "styl/_true";',
      "$catch-errors.value = true;",
      'true-error("mixin failure");',
    ].join("\n");
    const css = stylus.render(source, {
      paths: [packagePath, packageStylPath],
    });

    assert(css.indexOf("/* ERROR: */") !== -1);
    assert(css.indexOf("/*   mixin failure */") !== -1);
  });
});
