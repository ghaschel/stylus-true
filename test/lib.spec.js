var assert = require("assert/strict");
var path = require("path");

var main = require("../lib/main.js");

var expect = function (actual) {
  return {
    to: {
      contain: function (expected) {
        assert.ok(
          String(actual).indexOf(expected) !== -1,
          'expected "' + actual + '" to contain "' + expected + '"'
        );
      },
      deep: {
        equal: function (expected) {
          assert.deepEqual(actual, expected);
        },
      },
      equal: function (expected) {
        assert.equal(actual, expected);
      },
      throw: function (expected) {
        assert.equal(typeof actual, "function");
        assert.throws(actual, function (error) {
          var message = error && error.message ? error.message : String(error);

          return message.indexOf(expected) !== -1;
        });
      },
    },
  };
};

describe("#fail", function () {
  it("formats failure message", function () {
    var msg = main.formatFailureMessage({
      description: "It broke.",
      assertionType: "assert-equal",
      expected: "1",
      output: "2",
      details: "It really broke.",
    });
    var expected =
      "It broke. [type: assert-equal] -- It really broke." +
      "\n\n- Expected\n+ Received\n\n- 1\n+ 2\n";

    expect(msg).to.equal(expected);
  });

  it("formats failure message for multiple contains-string assertions", function () {
    var msg = main.formatFailureMessage({
      description: "Missing strings.",
      assertionType: "contains-string",
      expected: "height\nbackground-color\n20px",
      output: ".test-output {\n  height: 10px;\n  width: 20px;\n}",
    });

    expect(msg).to.contain("Missing strings.");
    expect(msg).to.contain(
      "Expected output to contain all of the following strings:"
    );
    expect(msg).to.contain('✓ "height"');
    expect(msg).to.contain('✗ "background-color"');
    expect(msg).to.contain('✓ "20px"');
    expect(msg).to.contain("Actual output:");
  });

  it("formats failure message for multiple contains assertions", function () {
    var msg = main.formatFailureMessage({
      description: "Missing CSS blocks.",
      assertionType: "contains",
      expected:
        ".test-output {\n  height: 10px;\n}\n---\n.test-output {\n  background-color: red;\n}\n---\n.test-output {\n  width: 20px;\n}",
      output: ".test-output {\n  height: 10px;\n  width: 20px;\n}",
    });

    expect(msg).to.contain("Missing CSS blocks.");
    expect(msg).to.contain(
      "Expected output to contain all of the following CSS blocks:"
    );
    expect(msg).to.contain("✓ Block 1:");
    expect(msg).to.contain("✗ Block 2:");
    expect(msg).to.contain("✓ Block 3:");
    expect(msg).to.contain("Actual output:");
  });
});

describe("#runStyl", function () {
  it("throws AssertionError on failure", function () {
    var stylus = [
      '@require "styl/_true";',
      '+test-module("Throw an error") {',
      '  +test("assertionError") {',
      "    assert-true(false);",
      "  }",
      "}",
    ].join("\n");
    var mock = function (name, cb) {
      cb();
    };
    var attempt = function () {
      main.runStyl({ data: stylus }, { describe: mock, it: mock });
    };
    expect(attempt).to.throw("[type: assert-true]");
    expect(attempt).to.throw("- [boolean] true'");
    expect(attempt).to.throw("+ [boolean] false'");
  });

  it("can specify includePaths", function () {
    var stylus = [
      '@require "test/styl/includes/_mixin";',
      '@require "styl/_true";',
      '+test-module("Module") {',
      '  +test("Test") {',
      '    +assert("Assertion") {',
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
    var mock = function (name, cb) {
      cb();
    };
    main.runStyl(
      {
        data: stylus,
        includePaths: [path.join(__dirname, "styl/includes")],
      },
      {
        describe: mock,
        it: mock,
      }
    );
  });

  it("can specify stylus engine to use", function () {
    var mock = function (name, cb) {
      cb();
    };
    var attempt = function () {
      main.runStyl(
        {
          data: "body {color: red}",
        },
        {
          styl: {
            render: function () {
              throw new Error("Custom stylus implementation called");
            },
          },
          describe: mock,
          it: mock,
        }
      );
    };
    expect(attempt).to.throw("Custom stylus implementation called");
  });
});

describe("#parse", function () {
  it("parses a passing non-output test", function () {
    var css = [
      "/* # Module: Utilities */",
      "/* ------------------- */",
      "/* Test: Map Add [function] */",
      "/*   ✔ Returns the sum of two numeric maps */",
    ].join("\n");
    var expected = [
      {
        module: "Utilities",
        tests: [
          {
            test: "Map Add [function]",
            assertions: [
              {
                description: "Returns the sum of two numeric maps",
                passed: true,
              },
            ],
          },
        ],
      },
    ];

    expect(main.parse(css)).to.deep.equal(expected);
  });

  it("ignores a summary", function () {
    var css = [
      "/* # SUMMARY ---------- */",
      "/* 17 Tests: */",
      "/*  - 14 Passed */",
      "/*  - 0 Failed */",
      "/*  - 3 Output to CSS */",
      "/* -------------------- */",
    ].join("\n");
    var expected = [];

    expect(main.parse(css)).to.deep.equal(expected);
  });

  it("parses a passing non-output test sans description", function () {
    var css = [
      "/* # Module: Utilities */",
      "/* ------------------- */",
      "/* Test: Map Add [function] */",
      "/*   ✔ */",
    ].join("\n");
    var expected = [
      {
        module: "Utilities",
        tests: [
          {
            test: "Map Add [function]",
            assertions: [
              {
                description: "<no description>",
                passed: true,
              },
            ],
          },
        ],
      },
    ];

    expect(main.parse(css)).to.deep.equal(expected);
  });

  it("parses a test following a summary", function () {
    var css = [
      "/* # SUMMARY ---------- */",
      "/* 17 Tests: */",
      "/*  - 14 Passed */",
      "/*  - 0 Failed */",
      "/*  - 3 Output to CSS */",
      "/* -------------------- */",
      "/* # Module: Utilities */",
      "/* ------------------- */",
      "/* Test: Map Add [function] */",
      "/*   ✔ Returns the sum of two numeric maps */",
    ].join("\n");
    var expected = [
      {
        module: "Utilities",
        tests: [
          {
            test: "Map Add [function]",
            assertions: [
              {
                description: "Returns the sum of two numeric maps",
                passed: true,
              },
            ],
          },
        ],
      },
    ];

    expect(main.parse(css)).to.deep.equal(expected);
  });

  it("parses a nested passing non-output test", function () {
    var css = [
      "/* # Module: Utilities :: nested */",
      "/* ------------------- */",
      "/* Test: Map Add [function] */",
      "/*   ✔ Returns the sum of two numeric maps */",
    ].join("\n");
    var expected = [
      {
        module: "Utilities",
        modules: [
          {
            module: "nested",
            tests: [
              {
                test: "Map Add [function]",
                assertions: [
                  {
                    description: "Returns the sum of two numeric maps",
                    passed: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    expect(main.parse(css)).to.deep.equal(expected);
  });

  it("parses nested modules from module boundary markers", function () {
    var css = [
      "/* # Module: Utilities */",
      "/* Test: Parent test */",
      "/*   ✔ [assert-equal] parent */",
      "/* # Module: nested */",
      "/* Test: Child test */",
      "/*   ✔ [assert-equal] child */",
      "/* END_MODULE */",
      "/* END_MODULE */",
    ].join("\n");
    var expected = [
      {
        module: "Utilities",
        tests: [
          {
            test: "Parent test",
            assertions: [
              {
                description: "[assert-equal] parent",
                passed: true,
              },
            ],
          },
        ],
        modules: [
          {
            module: "nested",
            tests: [
              {
                test: "Child test",
                assertions: [
                  {
                    description: "[assert-equal] child",
                    passed: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    expect(main.parse(css)).to.deep.equal(expected);
  });

  it("parses nested modules and tests from TRUE marker comments", function () {
    var css = [
      "/* TRUE_MODULE_START: Outer */",
      "/* # Module: Outer */",
      "/* --------------- */",
      "/* TRUE_TEST_START: parent test */",
      "/* Test: parent test */",
      "/*   ✔ [assert-equal] parent */",
      "/* TRUE_TEST_END: parent test */",
      "/* TRUE_MODULE_START: Outer */",
      "/* # Module: Outer */",
      "/* --------------- */",
      "/* TRUE_TEST_START: child test */",
      "/* Test: child test */",
      "/*   ✔ [assert-equal] child */",
      "/* TRUE_TEST_END: child test */",
      "/* TRUE_MODULE_END: Outer */",
      "/* END_MODULE */",
      "/* TRUE_MODULE_END: Outer */",
      "/* END_MODULE */",
    ].join("\n");
    var expected = [
      {
        module: "Outer",
        tests: [
          {
            test: "parent test",
            assertions: [
              {
                description: "[assert-equal] parent",
                passed: true,
              },
            ],
          },
        ],
        modules: [
          {
            module: "Outer",
            tests: [
              {
                test: "child test",
                assertions: [
                  {
                    description: "[assert-equal] child",
                    passed: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    expect(main.parse(css)).to.deep.equal(expected);
  });

  it("does not skip later legacy modules when a TRUE module display comment is missing", function () {
    var css = [
      "/* TRUE_MODULE_START: Structured */",
      "/* TRUE_MODULE_END: Structured */",
      "/* # Module: Legacy */",
      "/* Test: legacy test */",
      "/*   ✔ [assert-equal] legacy */",
      "/* END_MODULE */",
    ].join("\n");
    var expected = [
      {
        module: "Structured",
        tests: [],
      },
      {
        module: "Legacy",
        tests: [
          {
            test: "legacy test",
            assertions: [
              {
                description: "[assert-equal] legacy",
                passed: true,
              },
            ],
          },
        ],
      },
    ];

    expect(main.parse(css)).to.deep.equal(expected);
  });

  it("does not skip later legacy tests when a TRUE test display comment is missing", function () {
    var css = [
      "/* # Module: Module */",
      "/* TRUE_TEST_START: repeated */",
      "/*   ✔ [assert-equal] structured */",
      "/* TRUE_TEST_END: repeated */",
      "/* Test: repeated */",
      "/*   ✔ [assert-equal] legacy */",
      "/* END_MODULE */",
    ].join("\n");
    var expected = [
      {
        module: "Module",
        tests: [
          {
            test: "repeated",
            assertions: [
              {
                description: "[assert-equal] structured",
                passed: true,
              },
            ],
          },
          {
            test: "repeated",
            assertions: [
              {
                description: "[assert-equal] legacy",
                passed: true,
              },
            ],
          },
        ],
      },
    ];

    expect(main.parse(css)).to.deep.equal(expected);
  });

  it("throws on END_MODULE without an open module", function () {
    var css = ["/* END_MODULE */"].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Unexpected module end marker "END_MODULE"; looking for module'
    );
  });

  it("throws on mismatched TRUE module end markers", function () {
    var css = [
      "/* TRUE_MODULE_START: Outer */",
      "/* # Module: Outer */",
      "/* TRUE_MODULE_END: Inner */",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Mismatched module end marker "Inner"; expected "Outer"'
    );
  });

  it("throws on mismatched TRUE test end markers", function () {
    var css = [
      "/* TRUE_MODULE_START: Module */",
      "/* # Module: Module */",
      "/* TRUE_TEST_START: expected test */",
      "/* Test: expected test */",
      "/* TRUE_TEST_END: other test */",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Mismatched test end marker "other test"; expected "expected test"'
    );
  });

  it("throws on TRUE test end markers without an open test", function () {
    var css = [
      "/* TRUE_MODULE_START: Module */",
      "/* # Module: Module */",
      "/* TRUE_TEST_END: missing */",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Unexpected test end marker "TRUE_TEST_END: missing"; looking for test'
    );
  });

  it("throws on TRUE module start markers before closing the current test", function () {
    var css = [
      "/* TRUE_MODULE_START: Module */",
      "/* # Module: Module */",
      "/* TRUE_TEST_START: test */",
      "/* Test: test */",
      "/* TRUE_MODULE_START: Nested */",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Unexpected module start marker "TRUE_MODULE_START: Nested" before test end marker'
    );
  });

  it("throws on TRUE module end markers before closing the current test", function () {
    var css = [
      "/* TRUE_MODULE_START: Module */",
      "/* # Module: Module */",
      "/* TRUE_TEST_START: test */",
      "/* Test: test */",
      "/* TRUE_MODULE_END: Module */",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Unexpected module end marker "TRUE_MODULE_END: Module" before test end marker'
    );
  });

  it("throws on unclosed TRUE test markers at EOF", function () {
    var css = [
      "/* TRUE_MODULE_START: Module */",
      "/* # Module: Module */",
      "/* TRUE_TEST_START: missing end */",
      "/* Test: missing end */",
      "/*   ✔ [assert-equal] pass */",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      "Unexpected end of CSS; looking for TRUE_TEST_END: missing end."
    );
  });

  it("throws on unclosed TRUE module markers at EOF", function () {
    var css = [
      "/* TRUE_MODULE_START: Module */",
      "/* # Module: Module */",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      "Unexpected end of CSS; looking for TRUE_MODULE_END: Module."
    );
  });

  it("parses a failing non-output test", function () {
    var css = [
      "/* # Module: Assert */",
      "/* ---------------- */",
      "/* Test: Simple assertions */",
      "/*   ✖ FAILED: [assert-true] True should assert true. */",
      "/*     - Output: [bool] false */",
      "/*     - Expected: [bool] true */",
      "/*     - Details: Broken tautology is broken. */",
    ].join("\n");
    var expected = [
      {
        module: "Assert",
        tests: [
          {
            test: "Simple assertions",
            assertions: [
              {
                description: "True should assert true.",
                passed: false,
                assertionType: "assert-true",
                output: "[bool] false",
                expected: "[bool] true",
                details: "Broken tautology is broken.",
              },
            ],
          },
        ],
      },
    ];

    expect(main.parse(css)).to.deep.equal(expected);
  });

  it("parses a failing non-output test with no failure details", function () {
    var css = [
      "/* # Module: Assert */",
      "/* ---------------- */",
      "/* Test: Simple assertions */",
      "/*   ✖ FAILED: [assert-true] True should assert true. */",
      "/*   ✔ False should assert false */",
    ].join("\n");
    var expected = [
      {
        module: "Assert",
        tests: [
          {
            test: "Simple assertions",
            assertions: [
              {
                description: "True should assert true.",
                passed: false,
                assertionType: "assert-true",
              },
              {
                description: "False should assert false",
                passed: true,
              },
            ],
          },
        ],
      },
    ];

    expect(main.parse(css)).to.deep.equal(expected);
  });

  it("parses a passing output test", function () {
    var css = [
      "/* # Module: Assert */",
      "/* Test: CSS output assertions */",
      "/*   ASSERT: Input and output selector patterns match   */",
      "/* */",
      "/*   OUTPUT   */",
      ".test-output {",
      "  -property: value; }",
      "",
      "/*   END_OUTPUT   */",
      "/* */",
      "/*   EXPECTED   */",
      ".test-output {",
      "  -property: value; }",
      "",
      "/*   END_EXPECTED   */",
      "/* */",
      "/*   END_ASSERT   */",
    ].join("\n");
    var expected = [
      {
        module: "Assert",
        tests: [
          {
            test: "CSS output assertions",
            assertions: [
              {
                description: "Input and output selector patterns match",
                assertionType: "equal",
                passed: true,
                output: ".test-output {\n  -property: value;\n}",
                expected: ".test-output {\n  -property: value;\n}",
              },
            ],
          },
        ],
      },
    ];

    expect(main.parse(css)).to.deep.equal(expected);
  });

  it("defaults blank output assertion descriptions to the current test", function () {
    var css = [
      "/* # Module: Assert */",
      "/* Test: CSS output assertions */",
      "/*   ASSERT:    */",
      "/*   OUTPUT   */",
      ".test-output {",
      "  -property: value; }",
      "/*   END_OUTPUT   */",
      "/*   EXPECTED   */",
      ".test-output {",
      "  -property: value; }",
      "/*   END_EXPECTED   */",
      "/*   END_ASSERT   */",
    ].join("\n");

    expect(main.parse(css)[0].tests[0].assertions[0].description).to.equal(
      "CSS output assertions"
    );
  });

  it("parses a passing output test with loud comments", function () {
    var css = [
      "/* Some random loud comment */",
      "/* # Module: Assert */",
      "/* Test: CSS output assertions */",
      "/*   ASSERT: Input and output selector patterns match   */",
      "/* */",
      "/*   OUTPUT   */",
      "/* Some loud comment */",
      ".test-output {",
      "  -property: value; }",
      "",
      "/*   END_OUTPUT   */",
      "/* */",
      "/*   EXPECTED   */",
      "/* Some loud comment */",
      ".test-output {",
      "  -property: value; }",
      "",
      "/*   END_EXPECTED   */",
      "/* */",
      "/*   END_ASSERT   */",
    ].join("\n");
    var expected = [
      {
        module: "Assert",
        tests: [
          {
            test: "CSS output assertions",
            assertions: [
              {
                description: "Input and output selector patterns match",
                assertionType: "equal",
                passed: true,
                output:
                  "/* Some loud comment */\n\n.test-output {\n  -property: value;\n}",
                expected:
                  "/* Some loud comment */\n\n.test-output {\n  -property: value;\n}",
              },
            ],
          },
        ],
      },
    ];

    expect(main.parse(css)).to.deep.equal(expected);
  });

  it("parses a failing output test", function () {
    var css = [
      "/* # Module: Assert */",
      "/* Test: CSS output assertions */",
      "/*   ASSERT: Input and output selector patterns match   */",
      "/*   OUTPUT   */",
      ".test-output {",
      "  -property: value1; }",
      "",
      "/*   END_OUTPUT   */",
      "/*   EXPECTED   */",
      ".test-output {",
      "  -property: value2; }",
      "",
      "/*   END_EXPECTED   */",
      "/*   END_ASSERT   */",
    ].join("\n");
    var expected = [
      {
        module: "Assert",
        tests: [
          {
            test: "CSS output assertions",
            assertions: [
              {
                description: "Input and output selector patterns match",
                assertionType: "equal",
                passed: false,
                expected: ".test-output {\n  -property: value2;\n}",
                output: ".test-output {\n  -property: value1;\n}",
              },
            ],
          },
        ],
      },
    ];

    expect(main.parse(css)).to.deep.equal(expected);
  });

  it("respects declaration order in output tests", function () {
    var css = [
      "/* # Module: Assert */",
      "/* Test: CSS output assertions */",
      "/*   ASSERT: Input and output selector patterns match   */",
      "/*   OUTPUT   */",
      ".test-output {",
      "  -property2: value2; ",
      "  -property1: value1; ",
      "}",
      "",
      "/*   END_OUTPUT   */",
      "/*   EXPECTED   */",
      ".test-output {",
      "  -property1: value1; ",
      "  -property2: value2; ",
      "}",
      "/*   END_EXPECTED   */",
      "/*   END_ASSERT   */",
    ].join("\n");
    var expected = [
      {
        module: "Assert",
        tests: [
          {
            test: "CSS output assertions",
            assertions: [
              {
                description: "Input and output selector patterns match",
                assertionType: "equal",
                passed: false,
                expected:
                  ".test-output {\n  -property1: value1;\n  -property2: value2;\n}",
                output:
                  ".test-output {\n  -property2: value2;\n  -property1: value1;\n}",
              },
            ],
          },
        ],
      },
    ];

    expect(main.parse(css)).to.deep.equal(expected);
  });

  it("parses tests of comment output", function () {
    var css = [
      "/* # Module: True Message */",
      "/* ---------------------- */",
      "/* Test: Simple messages */",
      "/*   ASSERT: Render as CSS comments   */",
      "/*   OUTPUT   */",
      "/* This is a simple message */",
      "/*   END_OUTPUT   */",
      "/*   EXPECTED   */",
      "/* This is a simple message */",
      "/*   END_EXPECTED   */",
      "/*   END_ASSERT   */",
      "/*  */",
    ].join("\n");
    var expected = [
      {
        module: "True Message",
        tests: [
          {
            test: "Simple messages",
            assertions: [
              {
                description: "Render as CSS comments",
                assertionType: "equal",
                passed: true,
                expected: "/* This is a simple message */",
                output: "/* This is a simple message */",
              },
            ],
          },
        ],
      },
    ];

    expect(main.parse(css)).to.deep.equal(expected);
  });

  it("ignores unexpected rule types", function () {
    var css = ".foo { -prop: value; }";

    expect(main.parse(css)).to.deep.equal([]);
  });

  it("throws on output markers outside assert blocks", function () {
    var css = ["/* # Module: M */", "/* Test: T */", "/*   OUTPUT   */"].join(
      "\n"
    );
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Unexpected output assertion marker "OUTPUT" outside assert(); looking for ASSERT'
    );
  });

  it("throws on incomplete output assertions at EOF", function () {
    var css = [
      "/* # Module: M */",
      "/* Test: T */",
      "/*   ASSERT: incomplete   */",
      "/*   OUTPUT   */",
      ".test-output {",
      "  -property: value; }",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw("Unexpected end of CSS; looking for END_OUTPUT.");
  });

  it("throws when an output assertion is missing output", function () {
    var css = [
      "/* # Module: M */",
      "/* Test: T */",
      "/*   ASSERT: missing output   */",
      "/*   EXPECTED   */",
      ".test-output {",
      "  -property: value; }",
      "/*   END_EXPECTED   */",
      "/*   END_ASSERT   */",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Unexpected comment "EXPECTED"; looking for OUTPUT'
    );
  });

  it("throws when an output assertion is missing a comparison block", function () {
    var css = [
      "/* # Module: M */",
      "/* Test: T */",
      "/*   ASSERT: missing comparison   */",
      "/*   OUTPUT   */",
      ".test-output {",
      "  -property: value; }",
      "/*   END_OUTPUT   */",
      "/*   END_ASSERT   */",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Unexpected comment "END_ASSERT"; looking for EXPECTED'
    );
  });

  it("throws on duplicate output markers inside an assertion", function () {
    var css = [
      "/* # Module: M */",
      "/* Test: T */",
      "/*   ASSERT: duplicate output   */",
      "/*   OUTPUT   */",
      "/*   OUTPUT   */",
      ".test-output {",
      "  -property: value; }",
      "/*   END_OUTPUT   */",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Unexpected output assertion marker "OUTPUT"; looking for END_OUTPUT'
    );
  });

  it("throws error on unexpected rule type instead of end summary", function () {
    var css = ["/* # SUMMARY ---------- */", ".foo { -prop: value; }"].join(
      "\n"
    );
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      [
        'Line 2, column 1: Unexpected rule type "rule"; looking for end summary.',
        "-- Context --",
        "/* # SUMMARY ---------- */",
        ".foo { -prop: value; }",
        "^",
      ].join("\n")
    );
  });

  it("accepts a number of context lines to display on error", function () {
    var css = ["/* # SUMMARY ---------- */", ".foo { -prop: value; }"].join(
      "\n"
    );
    var attempt = function () {
      main.parse(css, 1);
    };

    expect(attempt).to.throw(
      [
        'Line 2, column 1: Unexpected rule type "rule"; looking for end summary.',
        "-- Context --",
        ".foo { -prop: value; }",
        "^",
      ].join("\n")
    );
  });

  it("handles a blank comment before module header", function () {
    var css = ["/*  */", "/* # Module: M */"].join("\n");

    expect(main.parse(css)).to.deep.equal([
      {
        module: "M",
        tests: [],
      },
    ]);
  });

  it("ignores unexpected rule type instead of test", function () {
    var css = ["/* # Module: M */", ".foo { -prop: value; }"].join("\n");

    expect(main.parse(css)).to.deep.equal([
      {
        module: "M",
        tests: [],
      },
    ]);
  });

  it("handles a blank comment before test header", function () {
    var css = ["/* # Module: M */", "/*  */", "/* Test: T */"].join("\n");

    expect(main.parse(css)).to.deep.equal([
      {
        module: "M",
        tests: [
          {
            test: "T",
            assertions: [],
          },
        ],
      },
    ]);
  });

  it("ignores unexpected rule type instead of assertion", function () {
    var css = [
      "/* # Module: M */",
      "/* Test: T */",
      ".foo { -prop: value; }",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(main.parse(css)).to.deep.equal([
      {
        module: "M",
        tests: [
          {
            test: "T",
            assertions: [],
          },
        ],
      },
    ]);
  });

  it("handles a blank comment before assertion", function () {
    var css = [
      "/* # Module: M */",
      "/* Test: T */",
      "/*  */",
      "/*   ✔ Does the thing right */",
    ].join("\n");

    expect(main.parse(css)).to.deep.equal([
      {
        module: "M",
        tests: [
          {
            test: "T",
            assertions: [
              {
                description: "Does the thing right",
                passed: true,
              },
            ],
          },
        ],
      },
    ]);
  });

  it("allows unexpected comment before next module header", function () {
    var css = [
      "/* # Module: M */",
      "/* Test: T */",
      "/*   ✖ FAILED: [assert-true] True should assert true. */",
      "/*     - foobar */",
      "/* # Module: M2 */",
    ].join("\n");
    expect(main.parse(css)).to.deep.equal([
      {
        module: "M",
        tests: [
          {
            test: "T",
            assertions: [
              {
                assertionType: "assert-true",
                description: "True should assert true.",
                passed: false,
              },
            ],
          },
        ],
      },
      {
        module: "M2",
        tests: [],
      },
    ]);
  });

  it("throws error on unexpected rule type instead of failure detail", function () {
    var css = [
      "/* # Module: M */",
      "/* Test: T */",
      "/*   ✖ FAILED: [assert-true] True should assert true. */",
      ".foo { -prop: val; }",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Line 4, column 1: Unexpected rule type "rule"; looking for output/expected'
    );
  });

  it("throws error on unexpected rule type instead of OUTPUT", function () {
    var css = [
      "/* # Module: M */",
      "/* Test: T */",
      "/*   ASSERT: Input and output selector patterns match   */",
      ".foo { -prop: val; }",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Line 4, column 1: Unexpected rule type "rule"; looking for OUTPUT'
    );
  });

  it("throws error on unexpected comment instead of OUTPUT", function () {
    var css = [
      "/* # Module: M */",
      "/* Test: T */",
      "/*   ASSERT: Input and output selector patterns match   */",
      "/* foo */",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Line 4, column 1: Unexpected comment "foo"; looking for OUTPUT'
    );
  });

  it("throws error on unexpected rule type instead of EXPECTED", function () {
    var css = [
      "/* # Module: M */",
      "/* Test: T */",
      "/*   ASSERT: Input and output selector patterns match   */",
      "/*   OUTPUT   */",
      ".test-output {",
      "  -property: value1; }",
      "",
      "/*   END_OUTPUT   */",
      ".foo { -prop: val; }",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Line 9, column 1: Unexpected rule type "rule"; looking for EXPECTED'
    );
  });

  it("throws error on unexpected comment instead of EXPECTED", function () {
    var css = [
      "/* # Module: M */",
      "/* Test: T */",
      "/*   ASSERT: Input and output selector patterns match   */",
      "/*   OUTPUT   */",
      ".test-output {",
      "  -property: value1; }",
      "",
      "/*   END_OUTPUT   */",
      "/* foo */",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Line 9, column 1: Unexpected comment "foo"; looking for EXPECTED'
    );
  });

  it("throws error on unexpected rule type instead of END_ASSERT", function () {
    var css = [
      "/* # Module: M */",
      "/* Test: T */",
      "/*   ASSERT: Input and output selector patterns match   */",
      "/*   OUTPUT   */",
      ".test-output {",
      "  -property: value1; }",
      "",
      "/*   END_OUTPUT   */",
      "/*   EXPECTED   */",
      ".test-output {",
      "  -property: value; }",
      "",
      "/*   END_EXPECTED   */",
      ".foo { -prop: val; }",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Line 14, column 1: Unexpected rule type "rule"; looking for END_ASSERT'
    );
  });

  it("throws error on unexpected comment instead of END_ASSERT", function () {
    var css = [
      "/* # Module: M */",
      "/* Test: T */",
      "/*   ASSERT: Input and output selector patterns match   */",
      "/*   OUTPUT   */",
      ".test-output {",
      "  -property: value1; }",
      "",
      "/*   END_OUTPUT   */",
      "/*   EXPECTED   */",
      ".test-output {",
      "  -property: value; }",
      "",
      "/*   END_EXPECTED   */",
      "/* foo */",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Line 14, column 1: Unexpected comment "foo"; looking for END_ASSERT'
    );
  });

  it("throws a clear error when expect is mixed with contains", function () {
    var css = [
      "/* # Module: M */",
      "/* Test: T */",
      "/*   ASSERT:    */",
      "/*   OUTPUT   */",
      ".test-output {",
      "  width: 20px; }",
      "/*   END_OUTPUT   */",
      "/*   EXPECTED   */",
      ".test-output {",
      "  width: 20px; }",
      "/*   END_EXPECTED   */",
      "/*   CONTAINED   */",
      ".test-output {",
      "  width: 20px; }",
      "/*   END_CONTAINED   */",
      "/*   END_ASSERT   */",
    ].join("\n");
    var attempt = function () {
      main.parse(css);
    };

    expect(attempt).to.throw(
      'Cannot mix output assertion modes in one assert(): found "contains()" after "expect()". Split them into separate assert() blocks.'
    );
  });

  describe("#contains", function () {
    it("parses a passing output test", function () {
      var css = [
        "/* # Module: Contains */",
        "/* Test: CSS output contains */",
        "/*   ASSERT: Output selector pattern contains input pattern   */",
        "/* */",
        "/*   OUTPUT   */",
        ".test-output {",
        "  height: 10px;",
        "  width: 20px; }",
        "/*   END_OUTPUT   */",
        "/* */",
        "/*   CONTAINED   */",
        ".test-output {",
        "  height: 10px; }",
        "",
        "/*   END_CONTAINED   */",
        "/* */",
        "/*   END_ASSERT   */",
      ].join("\n");
      var expected = [
        {
          module: "Contains",
          tests: [
            {
              test: "CSS output contains",
              assertions: [
                {
                  description: "Output selector pattern contains input pattern",
                  assertionType: "contains",
                  passed: true,
                  output: ".test-output {\n  height: 10px;\n  width: 20px;\n}",
                  expected: ".test-output {\n  height: 10px;\n}",
                },
              ],
            },
          ],
        },
      ];

      expect(main.parse(css)).to.deep.equal(expected);
    });

    it("parses a passing output test with loud comments", function () {
      var css = [
        "/* Some random loud comment */",
        "/* # Module: Contains */",
        "/* Test: CSS output contains */",
        "/*   ASSERT: Output selector pattern contains input pattern   */",
        "/* */",
        "/*   OUTPUT   */",
        "/* Some loud comment */",
        ".test-output {",
        "  height: 10px;",
        "  width: 20px; }",
        "",
        "/*   END_OUTPUT   */",
        "/* */",
        "/*   CONTAINED   */",
        "/* Some loud comment */",
        ".test-output {",
        "  height: 10px; }",
        "",
        "/*   END_CONTAINED   */",
        "/* */",
        "/*   END_ASSERT   */",
      ].join("\n");
      var expected = [
        {
          module: "Contains",
          tests: [
            {
              test: "CSS output contains",
              assertions: [
                {
                  description: "Output selector pattern contains input pattern",
                  assertionType: "contains",
                  passed: true,
                  output:
                    "/* Some loud comment */\n\n.test-output {\n  height: 10px;\n  width: 20px;\n}",
                  expected:
                    "/* Some loud comment */\n\n.test-output {\n  height: 10px;\n}",
                },
              ],
            },
          ],
        },
      ];

      expect(main.parse(css)).to.deep.equal(expected);
    });

    it("parses a failing output test", function () {
      var css = [
        "/* # Module: Contains */",
        "/* Test: CSS output contains */",
        "/*   ASSERT: Output selector pattern contains input pattern   */",
        "/* */",
        "/*   OUTPUT   */",
        ".test-output {",
        "  height: 10px;",
        "  width: 20px; }",
        "",
        "/*   END_OUTPUT   */",
        "/* */",
        "/*   CONTAINED   */",
        ".test-output {",
        "  height: 20px; }",
        "",
        "/*   END_CONTAINED   */",
        "/* */",
        "/*   END_ASSERT   */",
      ].join("\n");
      var expected = [
        {
          module: "Contains",
          tests: [
            {
              test: "CSS output contains",
              assertions: [
                {
                  description: "Output selector pattern contains input pattern",
                  assertionType: "contains",
                  passed: false,
                  output: ".test-output {\n  height: 10px;\n  width: 20px;\n}",
                  expected: ".test-output {\n  height: 20px;\n}",
                },
              ],
            },
          ],
        },
      ];

      expect(main.parse(css)).to.deep.equal(expected);
    });

    it("parses a failing output test (wrong selector)", function () {
      var css = [
        "/* # Module: Contains */",
        "/* Test: CSS output contains */",
        "/*   ASSERT: Output selector pattern contains input pattern   */",
        "/* */",
        "/*   OUTPUT   */",
        ".test-output {",
        "  height: 10px;",
        "  width: 20px; }",
        "",
        "/*   END_OUTPUT   */",
        "/* */",
        "/*   CONTAINED   */",
        ".other-class {",
        "  height: 20px; }",
        "",
        "/*   END_CONTAINED   */",
        "/* */",
        "/*   END_ASSERT   */",
      ].join("\n");
      var expected = [
        {
          module: "Contains",
          tests: [
            {
              test: "CSS output contains",
              assertions: [
                {
                  description: "Output selector pattern contains input pattern",
                  assertionType: "contains",
                  passed: false,
                  output: ".test-output {\n  height: 10px;\n  width: 20px;\n}",
                  expected: ".other-class {\n  height: 20px;\n}",
                },
              ],
            },
          ],
        },
      ];

      expect(main.parse(css)).to.deep.equal(expected);
    });

    it("parses multiple contains assertions", function () {
      var css = [
        "/* # Module: Contains */",
        "/* Test: Multiple contains blocks */",
        "/*   ASSERT:    */",
        "/*   OUTPUT   */",
        ".test-output {",
        "  height: 10px;",
        "  width: 20px;",
        "  border: thin solid currentColor;",
        "}",
        "/*   END_OUTPUT   */",
        "/*   CONTAINED   */",
        ".test-output {",
        "  height: 10px;",
        "}",
        "/*   END_CONTAINED   */",
        "/*   CONTAINED   */",
        ".test-output {",
        "  width: 20px;",
        "}",
        "/*   END_CONTAINED   */",
        "/*   CONTAINED   */",
        ".test-output {",
        "  border: thin solid currentColor;",
        "}",
        "/*   END_CONTAINED   */",
        "/*   END_ASSERT   */",
      ].join("\n");
      var expected = [
        {
          module: "Contains",
          tests: [
            {
              test: "Multiple contains blocks",
              assertions: [
                {
                  description: "Multiple contains blocks",
                  assertionType: "contains",
                  passed: true,
                  output:
                    ".test-output {\n  height: 10px;\n  width: 20px;\n  border: thin solid currentColor;\n}",
                  expected:
                    ".test-output {\n  height: 10px;\n}\n---\n.test-output {\n  width: 20px;\n}\n---\n.test-output {\n  border: thin solid currentColor;\n}",
                },
              ],
            },
          ],
        },
      ];

      expect(main.parse(css)).to.deep.equal(expected);
    });

    it("parses multiple failing contains assertions", function () {
      var css = [
        "/* # Module: Contains */",
        "/* Test: Multiple contains blocks with failure */",
        "/*   ASSERT:    */",
        "/*   OUTPUT   */",
        ".test-output {",
        "  height: 10px;",
        "  width: 20px;",
        "}",
        "/*   END_OUTPUT   */",
        "/*   CONTAINED   */",
        ".test-output {",
        "  height: 10px;",
        "}",
        "/*   END_CONTAINED   */",
        "/*   CONTAINED   */",
        ".test-output {",
        "  background-color: red;",
        "}",
        "/*   END_CONTAINED   */",
        "/*   CONTAINED   */",
        ".test-output {",
        "  width: 20px;",
        "}",
        "/*   END_CONTAINED   */",
        "/*   END_ASSERT   */",
      ].join("\n");
      var expected = [
        {
          module: "Contains",
          tests: [
            {
              test: "Multiple contains blocks with failure",
              assertions: [
                {
                  description: "Multiple contains blocks with failure",
                  assertionType: "contains",
                  passed: false,
                  output: ".test-output {\n  height: 10px;\n  width: 20px;\n}",
                  expected:
                    ".test-output {\n  height: 10px;\n}\n---\n.test-output {\n  background-color: red;\n}\n---\n.test-output {\n  width: 20px;\n}",
                },
              ],
            },
          ],
        },
      ];

      expect(main.parse(css)).to.deep.equal(expected);
    });

    it("matches modern selectors without splitting selector arguments", function () {
      var css = [
        "/* # Module: Contains */",
        "/* Test: Modern selectors */",
        "/*   ASSERT:    */",
        "/*   OUTPUT   */",
        ".card:has(.title, .media):where(:not(.disabled)) {",
        "  color: red;",
        "  display: grid;",
        "}",
        "/*   END_OUTPUT   */",
        "/*   CONTAINED   */",
        ".card:has(.title, .media):where(:not(.disabled)) {",
        "  display: grid;",
        "}",
        "/*   END_CONTAINED   */",
        "/*   END_ASSERT   */",
      ].join("\n");
      var assertion = main.parse(css)[0].tests[0].assertions[0];

      expect(assertion.passed).to.equal(true);
      expect(assertion.assertionType).to.equal("contains");
    });

    it("does not treat reordered selector lists as equivalent", function () {
      var css = [
        "/* # Module: Contains */",
        "/* Test: Selector list order */",
        "/*   ASSERT:    */",
        "/*   OUTPUT   */",
        ".a, .b {",
        "  color: red;",
        "}",
        "/*   END_OUTPUT   */",
        "/*   CONTAINED   */",
        ".b, .a {",
        "  color: red;",
        "}",
        "/*   END_CONTAINED   */",
        "/*   END_ASSERT   */",
      ].join("\n");
      var assertion = main.parse(css)[0].tests[0].assertions[0];

      expect(assertion.passed).to.equal(false);
    });

    it("ignores declaration order for contains assertions", function () {
      var css = [
        "/* # Module: Contains */",
        "/* Test: Declaration order */",
        "/*   ASSERT:    */",
        "/*   OUTPUT   */",
        ".test-output {",
        "  width: 20px;",
        "  height: 10px;",
        "}",
        "/*   END_OUTPUT   */",
        "/*   CONTAINED   */",
        ".test-output {",
        "  height: 10px;",
        "  width: 20px;",
        "}",
        "/*   END_CONTAINED   */",
        "/*   END_ASSERT   */",
      ].join("\n");
      var assertion = main.parse(css)[0].tests[0].assertions[0];

      expect(assertion.passed).to.equal(true);
    });

    it("parses non-standard at-rules that css 2.2.4 rejected", function () {
      var css = [
        "/* # Module: Contains */",
        "/* Test: Non-standard at-rules */",
        "/*   ASSERT:    */",
        "/*   OUTPUT   */",
        "@container style(--responsive: true) {",
        "  .card:has(.title, .media) {",
        "    color: red;",
        "    display: grid;",
        "  }",
        "}",
        "@unknown-rule foo(bar, baz) {",
        "  :root {",
        "    --brand-color: rebeccapurple;",
        "  }",
        "}",
        "@custom-media --small (width <= 30em);",
        "/*   END_OUTPUT   */",
        "/*   CONTAINED   */",
        "@container style(--responsive: true) {",
        "  .card:has(.title, .media) {",
        "    display: grid;",
        "  }",
        "}",
        "@unknown-rule foo(bar, baz) {",
        "  :root {",
        "    --brand-color: rebeccapurple;",
        "  }",
        "}",
        "@custom-media --small (width <= 30em);",
        "/*   END_CONTAINED   */",
        "/*   END_ASSERT   */",
      ].join("\n");
      var assertion = main.parse(css)[0].tests[0].assertions[0];

      expect(assertion.passed).to.equal(true);
      expect(assertion.output).to.contain(
        "@container style(--responsive: true)"
      );
      expect(assertion.output).to.contain("@custom-media --small");
    });

    it("matches nested at-rules structurally", function () {
      var css = [
        "/* # Module: Contains */",
        "/* Test: Nested at-rules */",
        "/*   ASSERT:    */",
        "/*   OUTPUT   */",
        "@supports selector(:has(*)) {",
        "  @media (min-width: 30em) {",
        "    @container card (inline-size > 20rem) {",
        "      :root {",
        "        --space: 1rem;",
        "        --color: currentColor;",
        "      }",
        "    }",
        "  }",
        "}",
        "/*   END_OUTPUT   */",
        "/*   CONTAINED   */",
        "@supports selector(:has(*)) {",
        "  @media (min-width: 30em) {",
        "    @container card (inline-size > 20rem) {",
        "      :root {",
        "        --color: currentColor;",
        "      }",
        "    }",
        "  }",
        "}",
        "/*   END_CONTAINED   */",
        "/*   END_ASSERT   */",
      ].join("\n");
      var assertion = main.parse(css)[0].tests[0].assertions[0];

      expect(assertion.passed).to.equal(true);
    });

    it("throws on unexpected comments after CONTAINED", function () {
      var css = [
        "/* # Module: M */",
        "/* Test: T */",
        "/*   ASSERT:    */",
        "/*   OUTPUT   */",
        ".test-output {",
        "  height: 10px; }",
        "/*   END_OUTPUT   */",
        "/*   CONTAINED   */",
        ".test-output {",
        "  height: 10px; }",
        "/*   END_CONTAINED   */",
        "/* unexpected comment */",
      ].join("\n");
      var attempt = function () {
        main.parse(css);
      };

      expect(attempt).to.throw(
        'Unexpected comment "unexpected comment"; looking for CONTAINED or END_ASSERT'
      );
    });

    it("throws a clear error when contains is mixed with contains-string", function () {
      var css = [
        "/* # Module: M */",
        "/* Test: T */",
        "/*   ASSERT:    */",
        "/*   OUTPUT   */",
        ".test-output {",
        "  width: 20px; }",
        "/*   END_OUTPUT   */",
        "/*   CONTAINED   */",
        ".test-output {",
        "  width: 20px; }",
        "/*   END_CONTAINED   */",
        "/*   CONTAINS_STRING   */",
        "/* width */",
        "/*   END_CONTAINS_STRING   */",
        "/*   END_ASSERT   */",
      ].join("\n");
      var attempt = function () {
        main.parse(css);
      };

      expect(attempt).to.throw(
        'Cannot mix output assertion modes in one assert(): found "contains-string()" after "contains()". Split them into separate assert() blocks.'
      );
    });
  });

  describe("#contains-string", function () {
    it("parses a passing output test", function () {
      var css = [
        "/* # Module: Contains-string */",
        "/* Test: CSS output contains-string */",
        "/*   ASSERT: Output selector pattern contains-string input pattern   */",
        "/* */",
        "/*   OUTPUT   */",
        ".test-output {",
        "  height: 10px;",
        "  width: 20px; }",
        "/*   END_OUTPUT   */",
        "/* */",
        "/*   CONTAINS_STRING   */",
        "/* height */",
        "/*   END_CONTAINS_STRING   */",
        "/* */",
        "/*   END_ASSERT   */",
      ].join("\n");
      var expected = [
        {
          module: "Contains-string",
          tests: [
            {
              test: "CSS output contains-string",
              assertions: [
                {
                  description:
                    "Output selector pattern contains-string input pattern",
                  assertionType: "contains-string",
                  passed: true,
                  output: ".test-output {\n  height: 10px;\n  width: 20px;\n}",
                  expected: "height",
                },
              ],
            },
          ],
        },
      ];

      expect(main.parse(css)).to.deep.equal(expected);
    });

    it("parses a failing output test", function () {
      var css = [
        "/* # Module: Contains-string */",
        "/* Test: CSS output contains-string */",
        "/*   ASSERT: Output selector pattern contains-string input pattern   */",
        "/* */",
        "/*   OUTPUT   */",
        ".test-output {",
        "  height: 10px;",
        "  width: 20px; }",
        "/*   END_OUTPUT   */",
        "/* */",
        "/*   CONTAINS_STRING   */",
        "/* background-color */",
        "/*   END_CONTAINS_STRING   */",
        "/* */",
        "/*   END_ASSERT   */",
      ].join("\n");
      var expected = [
        {
          module: "Contains-string",
          tests: [
            {
              test: "CSS output contains-string",
              assertions: [
                {
                  description:
                    "Output selector pattern contains-string input pattern",
                  assertionType: "contains-string",
                  passed: false,
                  output: ".test-output {\n  height: 10px;\n  width: 20px;\n}",
                  expected: "background-color",
                },
              ],
            },
          ],
        },
      ];

      expect(main.parse(css)).to.deep.equal(expected);
    });

    it("parses multiple contains-string assertions", function () {
      var css = [
        "/* # Module: Contains-string */",
        "/* Test: Multiple strings */",
        "/*   ASSERT:    */",
        "/*   OUTPUT   */",
        ".test-output {",
        "  height: 10px;",
        "  width: 20px;",
        "  border: thin solid currentColor;",
        "}",
        "/*   END_OUTPUT   */",
        "/*   CONTAINS_STRING   */",
        "/* height */",
        "/*   END_CONTAINS_STRING   */",
        "/*   CONTAINS_STRING   */",
        "/* solid */",
        "/*   END_CONTAINS_STRING   */",
        "/*   CONTAINS_STRING   */",
        "/* 20px */",
        "/*   END_CONTAINS_STRING   */",
        "/*   CONTAINS_STRING   */",
        "/* thin solid currentColor */",
        "/*   END_CONTAINS_STRING   */",
        "/*   END_ASSERT   */",
      ].join("\n");
      var expected = [
        {
          module: "Contains-string",
          tests: [
            {
              test: "Multiple strings",
              assertions: [
                {
                  description: "Multiple strings",
                  assertionType: "contains-string",
                  passed: true,
                  output:
                    ".test-output {\n  height: 10px;\n  width: 20px;\n  border: thin solid currentColor;\n}",
                  expected: "height\nsolid\n20px\nthin solid currentColor",
                },
              ],
            },
          ],
        },
      ];

      expect(main.parse(css)).to.deep.equal(expected);
    });

    it("parses multiple failing contains-string assertions", function () {
      var css = [
        "/* # Module: Contains-string */",
        "/* Test: Multiple strings with failure */",
        "/*   ASSERT:    */",
        "/*   OUTPUT   */",
        ".test-output {",
        "  height: 10px;",
        "  width: 20px; }",
        "/*   END_OUTPUT   */",
        "/*   CONTAINS_STRING   */",
        "/* height */",
        "/*   END_CONTAINS_STRING   */",
        "/*   CONTAINS_STRING   */",
        "/* background-color */",
        "/*   END_CONTAINS_STRING   */",
        "/*   CONTAINS_STRING   */",
        "/* 20px */",
        "/*   END_CONTAINS_STRING   */",
        "/*   END_ASSERT   */",
      ].join("\n");
      var expected = [
        {
          module: "Contains-string",
          tests: [
            {
              test: "Multiple strings with failure",
              assertions: [
                {
                  description: "Multiple strings with failure",
                  assertionType: "contains-string",
                  passed: false,
                  output: ".test-output {\n  height: 10px;\n  width: 20px;\n}",
                  expected: "height\nbackground-color\n20px",
                },
              ],
            },
          ],
        },
      ];

      expect(main.parse(css)).to.deep.equal(expected);
    });

    it("throws on unexpected comments after CONTAINS_STRING", function () {
      var css = [
        "/* # Module: M */",
        "/* Test: T */",
        "/*   ASSERT:    */",
        "/*   OUTPUT   */",
        ".test-output {",
        "  height: 10px; }",
        "/*   END_OUTPUT   */",
        "/*   CONTAINS_STRING   */",
        "/* height */",
        "/*   END_CONTAINS_STRING   */",
        "/* unexpected comment */",
      ].join("\n");
      var attempt = function () {
        main.parse(css);
      };

      expect(attempt).to.throw(
        'Unexpected comment "unexpected comment"; looking for CONTAINS_STRING or END_ASSERT'
      );
    });

    it("throws on unexpected rule types after CONTAINS_STRING", function () {
      var css = [
        "/* # Module: M */",
        "/* Test: T */",
        "/*   ASSERT:    */",
        "/*   OUTPUT   */",
        ".test-output {",
        "  height: 10px; }",
        "/*   END_OUTPUT   */",
        "/*   CONTAINS_STRING   */",
        "/* height */",
        "/*   END_CONTAINS_STRING   */",
        ".foo { -prop: val; }",
      ].join("\n");
      var attempt = function () {
        main.parse(css);
      };

      expect(attempt).to.throw(
        'Unexpected rule type "rule"; looking for CONTAINS_STRING or END_ASSERT'
      );
    });

    it("throws a clear error when contains-string is mixed with contains", function () {
      var css = [
        "/* # Module: M */",
        "/* Test: T */",
        "/*   ASSERT:    */",
        "/*   OUTPUT   */",
        ".test-output {",
        "  width: 20px; }",
        "/*   END_OUTPUT   */",
        "/*   CONTAINS_STRING   */",
        "/* width */",
        "/*   END_CONTAINS_STRING   */",
        "/*   CONTAINED   */",
        ".test-output {",
        "  width: 20px; }",
        "/*   END_CONTAINED   */",
        "/*   END_ASSERT   */",
      ].join("\n");
      var attempt = function () {
        main.parse(css);
      };

      expect(attempt).to.throw(
        'Cannot mix output assertion modes in one assert(): found "contains()" after "contains-string()". Split them into separate assert() blocks.'
      );
    });
  });
});
