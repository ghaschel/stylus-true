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

    const result = stylTrue.runStyl(
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
    assert.deepStrictEqual(result.deps, []);
  });

  it("passes normalized options for data renders", () => {
    const runner = createRunner();
    const filename = path.resolve(__dirname, "inline.styl");
    let renderContents;
    let renderOptions;

    const result = stylTrue.runStyl(
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
    assert.deepStrictEqual(result.deps, []);
  });

  it("renderStyl returns CSS, modules, and deps without runner callbacks", () => {
    const result = stylTrue.renderStyl({
      data: testSource(
        "RenderStyl",
        "returns parse data",
        "assert-equal(1, 1);"
      ),
    });

    assert(result.css.indexOf("# Module: RenderStyl") !== -1, result.css);
    assert.deepStrictEqual(result.modules, [
      {
        module: "RenderStyl",
        tests: [
          {
            test: "'returns parse data'",
            assertions: [
              {
                description: "[assert-equal]",
                passed: true,
              },
            ],
          },
        ],
      },
    ]);
    assert(Array.isArray(result.deps));
  });

  it("uses deps from injected Stylus engines when available", () => {
    const filename = path.resolve(__dirname, "inline-with-deps.styl");
    let depsFilename;

    const result = stylTrue.renderStyl(
      {
        data: testSource(
          "Injected Deps",
          "uses custom deps",
          "assert-equal(1, 1);"
        ),
        filename,
      },
      {
        styl: {
          render() {
            return passingCss;
          },
          deps(renderFilename) {
            depsFilename = renderFilename;
            return ["mock-dependency.styl"];
          },
        },
      }
    );

    assert.strictEqual(depsFilename, filename);
    assert.deepStrictEqual(result.deps, ["mock-dependency.styl"]);
  });

  it("renders data requiring styl/_true through package lookup paths", () => {
    const runner = createRunner();

    const result = stylTrue.runStyl(
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
    assert.strictEqual(result.modules[0].module, "Data");
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

  it("passes multiple use plugins without mutating caller arrays", () => {
    const runner = createRunner();
    const use = [
      (style) => {
        style.define("first-plugin-value", () => new stylus.nodes.Unit(20));
      },
      (style) => {
        style.define("second-plugin-value", () => new stylus.nodes.Unit(22));
      },
    ];

    stylTrue.runStyl(
      {
        data: testSource(
          "Use Plugins",
          "uses multiple plugin functions",
          "assert-equal(first-plugin-value() + second-plugin-value(), 42);"
        ),
        use,
      },
      {
        describe: runner.describe,
        it: runner.it,
      }
    );

    assert.strictEqual(use.length, 2);
    assert.deepStrictEqual(runner.calls, [
      ["describe", "Use Plugins"],
      ["it", "'uses multiple plugin functions'"],
    ]);
  });

  it("loads CLI-style pluginPaths with options", () => {
    const runner = createRunner();
    const pluginPaths = [
      {
        path: "test/styl/plugins/cli-plugin.js",
        options: { value: 64 },
      },
    ];

    stylTrue.runStyl(
      {
        data: testSource(
          "Plugin Paths",
          "uses cli-style plugins",
          "assert-equal(cli-plugin-value(), 64);"
        ),
        pluginPaths,
      },
      {
        describe: runner.describe,
        it: runner.it,
      }
    );

    assert.deepStrictEqual(pluginPaths, [
      {
        path: "test/styl/plugins/cli-plugin.js",
        options: { value: 64 },
      },
    ]);
    assert.deepStrictEqual(runner.calls, [
      ["describe", "Plugin Paths"],
      ["it", "'uses cli-style plugins'"],
    ]);
  });

  it("reports deps through return values and onDeps", () => {
    const runner = createRunner();
    const includePath = path.resolve(__dirname, "styl/includes");
    const source = [
      '@require "styl/_true";',
      '@require "_mixin";',
      "+test-module('Deps') {",
      "  +test('imports user fixture') {",
      "    assert-equal(1, 1);",
      "  }",
      "}",
    ].join("\n");
    let callbackDeps;
    let callbackResult;

    const result = stylTrue.runStyl(
      {
        data: source,
        filename: path.resolve(__dirname, "deps-inline.styl"),
        includePaths: [includePath],
      },
      {
        describe: runner.describe,
        it: runner.it,
        onDeps(deps, renderResult) {
          callbackDeps = deps;
          callbackResult = renderResult;
        },
      }
    );
    const userDependency = path.join("test", "styl", "includes", "_mixin.styl");

    assert(
      result.deps.some((dep) => dep.endsWith(userDependency)),
      result.deps
    );
    assert.strictEqual(callbackDeps, result.deps);
    assert.strictEqual(callbackResult, result);
    assert.deepStrictEqual(runner.calls, [
      ["describe", "Deps"],
      ["it", "'imports user fixture'"],
    ]);
  });

  it("reconstructs nested describe and it calls", () => {
    const runner = createRunner();
    const source = [
      '@require "styl/_true";',
      "+describe('Outer') {",
      "  +describe('Inner') {",
      "    +it('runs nested test') {",
      "      assert-equal(1, 1, 'nested pass');",
      "    }",
      "  }",
      "}",
    ].join("\n");

    stylTrue.runStyl(
      {
        data: source,
      },
      {
        describe: runner.describe,
        it: runner.it,
      }
    );

    assert.deepStrictEqual(runner.calls, [
      ["describe", "Outer"],
      ["describe", "Inner"],
      ["it", "'runs nested test'"],
    ]);
  });

  it("reconstructs nested test-module and test calls", () => {
    const runner = createRunner();
    const source = [
      '@require "styl/_true";',
      "+test-module('Parent') {",
      "  +test-module('Child') {",
      "    +test('runs child test') {",
      "      assert-equal(1, 1, 'child pass');",
      "    }",
      "  }",
      "}",
    ].join("\n");

    stylTrue.runStyl(
      {
        data: source,
      },
      {
        describe: runner.describe,
        it: runner.it,
      }
    );

    assert.deepStrictEqual(runner.calls, [
      ["describe", "Parent"],
      ["describe", "Child"],
      ["it", "'runs child test'"],
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
      assert(css.indexOf("/*  TRUE_MODULE_START: Module  */") !== -1, css);
      assert(css.indexOf("/*  TRUE_TEST_START: 'Test'  */") !== -1, css);
      assert(css.indexOf("/*  TRUE_TEST_END: 'Test'  */") !== -1, css);
      assert(css.indexOf("/*  TRUE_MODULE_END: Module  */") !== -1, css);
      assert(css.indexOf("/*  END_MODULE  */") !== -1, css);
    } finally {
      removeDir(tmp);
    }
  });

  it("emits explicit descriptions for value assertions and aliases", () => {
    const source = [
      '@require "styl/_true";',
      "+test-module('Descriptions') {",
      "  +test('Value descriptions') {",
      "    assert-true(true, 'assert true description');",
      "    assert-false(false, 'assert false description');",
      "    assert-equal(1, 1, 'assert equal description');",
      "    assert-unequal(1, 2, 'assert unequal description');",
      "    is-truthy(true, 'is truthy description');",
      "    is-falsy(false, 'is falsy description');",
      "    is-equal(1, 1, 'is equal description');",
      "    not-equal(1, 2, 'not equal description');",
      "  }",
      "}",
    ].join("\n");
    const css = stylus.render(source, {
      paths: [packagePath, packageStylPath],
    });

    assert(
      css.indexOf("/*   ✔ [assert-true] assert true description */") !== -1
    );
    assert(
      css.indexOf("/*   ✔ [assert-false] assert false description */") !== -1
    );
    assert(
      css.indexOf("/*   ✔ [assert-equal] assert equal description */") !== -1
    );
    assert(
      css.indexOf("/*   ✔ [assert-unequal] assert unequal description */") !==
        -1
    );
    assert(css.indexOf("/*   ✔ [assert-true] is truthy description */") !== -1);
    assert(css.indexOf("/*   ✔ [assert-false] is falsy description */") !== -1);
    assert(css.indexOf("/*   ✔ [assert-equal] is equal description */") !== -1);
    assert(
      css.indexOf("/*   ✔ [assert-unequal] not equal description */") !== -1
    );
  });

  it("emits explicit descriptions for failing value assertions", () => {
    const source = [
      '@require "styl/_true";',
      "+test-module('Descriptions') {",
      "  +test('Failure descriptions') {",
      "    assert-true(false, 'failing assert true description');",
      "  }",
      "}",
    ].join("\n");
    const css = stylus.render(source, {
      paths: [packagePath, packageStylPath],
    });

    assert(
      css.indexOf(
        "/*   ✖ FAILED: [assert-true] failing assert true description */"
      ) !== -1
    );
  });

  it("supports selector assertions with contextual selector strings", () => {
    const source = [
      '@require "styl/_true";',
      ".selector-fixture {",
      "  color: red;",
      "  a {",
      "    color: blue;",
      "    define('selector-context-path', selector(), true);",
      "  }",
      "}",
      "+test-module('Selector Assertions') {",
      "  +test('Selectors exist') {",
      "    assert-selector('.selector-fixture', 'root selector exists');",
      "    assert-selector(lookup('selector-context-path'), 'nested selector exists');",
      "    assert-equal(lookup('selector-context-path'), '.selector-fixture a');",
      "  }",
      "}",
    ].join("\n");
    const result = stylTrue.renderStyl({ data: source });
    const assertions = result.modules[0].tests[0].assertions;

    assert.deepStrictEqual(
      assertions.map((assertion) => assertion.passed),
      [true, true, true]
    );
  });

  it("supports current selector, selector stack, and not-null assertions", () => {
    const source = [
      '@require "styl/_true";',
      "+test-module('Stylus helper assertions')",
      "  +test('Selector context and local values')",
      "    $local-value = 12px",
      "    assert-not-null($local-value, 'local value exists')",
      "    .selector-fixture",
      "      &:hover",
      "        assert-current-selector('.selector-fixture:hover', 'current selector')",
      "        assert-selectors('.selector-fixture' '&:hover', 'selector stack')",
    ].join("\n");
    const result = stylTrue.renderStyl({ data: source });
    const assertions = result.modules[0].tests[0].assertions;

    assert.deepStrictEqual(
      assertions.map((assertion) => assertion.description),
      [
        "[assert-not-null] local value exists",
        "[assert-current-selector] current selector",
        "[assert-selectors] selector stack",
      ]
    );
    assert.deepStrictEqual(
      assertions.map((assertion) => assertion.passed),
      [true, true, true]
    );
  });

  it("emits failure comments for Stylus-specific assertions", () => {
    const source = [
      '@require "styl/_true";',
      "+test-module('Stylus-specific failures') {",
      "  +test('Reports failed assertions') {",
      "    assert-type(10px, 'string', 'wrong type');",
      "    assert-unit('value', px, 'non-unit value');",
      "    assert-selector('.missing-selector', 'missing selector');",
      "    assert-defined('missing-symbol', 'missing symbol');",
      "    assert-not-null(null, 'null value');",
      "    assert-json('test/styl/fixtures/assert-json.json', { name: 'wrong' }, 'json mismatch');",
      "    assert-current-selector('.missing-selector', 'current selector mismatch');",
      "    assert-selectors('.missing-selector', 'selector stack mismatch');",
      "  }",
      "}",
    ].join("\n");
    const result = stylTrue.renderStyl({ data: source });
    const assertions = result.modules[0].tests[0].assertions;

    assert.deepStrictEqual(
      assertions.map((assertion) => assertion.assertionType),
      [
        "assert-type",
        "assert-unit",
        "assert-selector",
        "assert-defined",
        "assert-not-null",
        "assert-json",
        "assert-current-selector",
        "assert-selectors",
      ]
    );
    assert.deepStrictEqual(
      assertions.map((assertion) => assertion.passed),
      [false, false, false, false, false, false, false, false]
    );
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
