# stylus-true

[![npm version](https://img.shields.io/npm/v/stylus-true.svg?maxAge=2592000)](https://www.npmjs.com/package/stylus-true)
[![SemVer](https://img.shields.io/github/tag/ghaschel/stylus-true.svg)](https://img.shields.io/github/tag/ghaschel/stylus-true.svg)
[![Github license](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![GitHub issues](https://img.shields.io/github/issues/ghaschel/stylus-true.svg)](https://github.com/ghaschel/vscode-angular-html/issues)
[![Build status](https://travis-ci.org/ghaschel/stylus-true.svg?branch=master)](https://travis-ci.org/ghaschel/stylus-true.svg?branch=master)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Greenkeeper badge](https://badges.greenkeeper.io/ghaschel/stylus-true.svg)](https://greenkeeper.io/)
[![codecov](https://codecov.io/gh/ghaschel/stylus-true/branch/master/graph/badge.svg)](https://codecov.io/gh/ghaschel/stylus-true)

stylus-true is a unit-testing framework for [Stylus](https://stylus-lang.com/) code, inspired by [True](https://github.com/oddbird/true). Tests are written in Stylus and can be compiled directly by Stylus or bridged into JavaScript runners for automated reporting.

## Install

```bash
npm install --save-dev stylus-true
```

Import the framework in a Stylus test file:

```stylus
@require '../node_modules/stylus-true/styl/_true.styl';
```

## Supported API

The public Stylus API currently supported by this package is:

| Area                  | API                                                                                                                     | Purpose                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Structure             | `test-module($name)` / `describe($name)`                                                                                | Group related tests.                                        |
| Tests                 | `test($name)` / `it($name)`                                                                                             | Define a single behavior or case.                           |
| Value assertions      | `assert-true($value)`, `assert-false($value)`, `assert-equal($actual, $expected)`, `assert-unequal($actual, $expected)` | Compare Stylus values during compilation.                   |
| Value aliases         | `is-truthy($value)`, `is-falsy($value)`, `is-equal($actual, $expected)`, `not-equal($actual, $expected)`                | sass-true-compatible aliases for value assertions.          |
| CSS output assertions | `assert($description)`, `output()`, `expect()`, `contains()`, `contains-string($string)`                                | Emit CSS assertion blocks for JavaScript runner comparison. |
| Errors                | `true-error($message, $source, $catch)`                                                                                 | Throw or catch testable error messages.                     |
| Reporting             | `report($terminal, $fail-on-error)`                                                                                     | Emit a summary to CSS comments and optionally the terminal. |

Value assertions are evaluated by Stylus during compilation. CSS output assertions are emitted into compiled CSS and compared by the JavaScript runner integration.

## Setting

`$true-terminal-output.value` is a boolean and defaults to `false`.

- `false` turns off direct terminal output from Stylus. Mocha and Jest still report through their normal runner output.
- `true` sends failure details and reports to the terminal through Stylus debug/warn output. This is useful when compiling manually without a JavaScript runner.

You can also pass a terminal flag directly to `report()`:

```stylus
report(true);
```

`$catch-errors.value` defaults to `false`, matching True. Set it to `true` to make `true-error()` return strings from functions or emit CSS comments from mixin calls instead of stopping compilation. Set it to `'warn'` to catch the error and also emit a Stylus warning.

## Value Tests

The `test-module`/`test` syntax and `describe`/`it` syntax are equivalent:

```stylus
+test-module('zip [function]') {
  +test('returns two lists zipped together') {
    assert-equal(
      zip(a b c, 1 2 3),
      (a 1, b 2, c 3)
    );
  }
}
```

```stylus
+describe('zip [function]') {
  +it('returns two lists zipped together') {
    assert-equal(
      zip(a b c, 1 2 3),
      (a 1, b 2, c 3)
    );
  }
}
```

The `is-truthy`, `is-falsy`, `is-equal`, and `not-equal` aliases match sass-true naming. `assert-equal`, `assert-unequal`, `is-equal`, and `not-equal` also accept the existing Stylus-specific `$inspect` argument for stringified comparisons.

## CSS Output Tests

Use `assert()` as the wrapper for one `output()` block and one `expect()`, `contains()`, or `contains-string()` check:

```stylus
+it('outputs a font size and line height based on keyword') {
  +assert('large font output') {
    +output() {
      font-size('large');
    }

    +expect() {
      font-size: 2rem;
      line-height: 3rem;
    }
  }
}
```

`expect()` requires the compiled CSS to match exactly. `contains()` passes when the expected declarations are present in the output. `contains-string()` passes when the compiled output includes a case-sensitive substring.

You can use multiple `contains()` blocks or multiple `contains-string()` calls inside one `assert()`:

```stylus
+it('outputs expected pieces') {
  +assert('partial output') {
    +output() {
      height: 10px;
      width: 20px;
      border: thin solid currentColor;
    }

    contains-string('width: 20px');
    contains-string('currentColor');
  }
}
```

Do not mix `expect()`, `contains()`, and `contains-string()` in the same `assert()`; keep each output assertion to one comparison mode.

## Catchable Errors

Stylus already has a global built-in `error()` function. Because Stylus does not provide Sass-style namespaces, this package exposes `true-error()` instead of a public `error()` helper to avoid shadowing the built-in.

```stylus
$catch-errors.value = true;

validate-size($value) {
  if (type($value) != 'unit') {
    return true-error('$value must be a unit', 'validate-size');
  }

  return $value;
}
```

When caught in a function context, `true-error()` returns a string such as `ERROR [validate-size]: $value must be a unit`. When caught as a mixin statement, it emits CSS comments. When not caught, it delegates to Stylus `error()` and stops compilation.

## JavaScript Runner Integration

Use `runStyl(stylOptions, trueOptions)` from `stylus-true/lib/main.js` to compile Stylus tests and map the parsed results to a runner's `describe` and `it` functions.

```js
const path = require("path");
const glob = require("glob");
const stylTrue = require("stylus-true/lib/main.js");

describe("Stylus tests", () => {
  const stylTestFiles = glob.sync(
    path.resolve(process.cwd(), "**/*.spec.styl")
  );

  stylTestFiles.forEach((file) => {
    stylTrue.runStyl({ file }, { describe, it });
  });
});
```

`runStyl` accepts Stylus render options such as `file`, `data`, `filename`, `includePaths`, `paths`, `use`, and `compress`. The second argument requires `describe` and `it`, and accepts `contextLines` for parse-error output.

## Compatibility

| Environment                | Status                   | Notes                                                                                                                      |
| -------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Node.js                    | Supported on Node `>=16` | Stylus `0.64.0` and the current test stack no longer target Node 14.                                                       |
| Stylus `0.64.0`            | Supported                | Direct compilation and package-internal plugin paths are covered by tests.                                                 |
| Standalone Stylus compiler | Supported with limits    | Value assertions and reports compile to comments. CSS output assertions need manual review unless a JS runner parses them. |
| Stylus CLI                 | Supported                | Use the same `@require` entrypoint; enable terminal output with `$true-terminal-output.value = true` or `report(true)`.    |
| Mocha                      | Supported and tested     | The repository runs `npm run test:mocha`.                                                                                  |
| Jest                       | Supported and tested     | The repository runs `npm run test:jest` with Jest 29.                                                                      |
| Vitest-style runners       | Compatible in principle  | Any runner exposing `describe` and `it` can use `runStyl`, but this repo does not yet include a Vitest test script.        |
| Stylus plugins             | Supported                | Direct Stylus `use()` calls and `runStyl({ use })` are supported.                                                          |

## Known Limits

Stylus evaluates nested block contents before wrapper mixins. Because of that, nested module context can be unreliable, and validation cannot always detect a missing `assert()` wrapper around `output()`, `expect()`, `contains()`, or `contains-string()` before compilation.

Use this safe structure for CSS output assertions:

```stylus
+test('output contract') {
  +assert('expected CSS') {
    +output() {
      width: 14em + 2;
    }

    +expect() {
      width: 16em;
    }
  }
}
```

See [KNOWN-ISSUES.MD](KNOWN-ISSUES.MD) for details.

## Acknowledgements

stylus-true exists because of the design and prior art in [True](https://github.com/oddbird/true).
