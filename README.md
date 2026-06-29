# stylus-true

[![npm version](https://img.shields.io/npm/v/stylus-true.svg?maxAge=2592000)](https://www.npmjs.com/package/stylus-true)
[![SemVer](https://img.shields.io/github/tag/ghaschel/stylus-true.svg)](https://img.shields.io/github/tag/ghaschel/stylus-true.svg)
[![Github license](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![GitHub issues](https://img.shields.io/github/issues/ghaschel/stylus-true.svg)](https://github.com/ghaschel/vscode-angular-html/issues)
[![Build status](https://travis-ci.org/ghaschel/stylus-true.svg?branch=master)](https://travis-ci.org/ghaschel/stylus-true.svg?branch=master)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Greenkeeper badge](https://badges.greenkeeper.io/ghaschel/stylus-true.svg)](https://greenkeeper.io/)

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

| Area                  | API                                                                                                                                                                                                                                                | Purpose                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Structure             | `test-module($name)` / `describe($name)`                                                                                                                                                                                                           | Group related tests.                                                                    |
| Tests                 | `test($name)` / `it($name)`                                                                                                                                                                                                                        | Define a single behavior or case.                                                       |
| Value assertions      | `assert-true($value)`, `assert-false($value)`, `assert-equal($actual, $expected)`, `assert-unequal($actual, $expected)`                                                                                                                            | Compare Stylus values during compilation.                                               |
| Value aliases         | `is-truthy($value)`, `is-falsy($value)`, `is-equal($actual, $expected)`, `not-equal($actual, $expected)`                                                                                                                                           | sass-true-compatible aliases for value assertions.                                      |
| Stylus assertions     | `assert-type($value, $type)`, `assert-unit($value, $unit)`, `assert-selector($selector)`, `assert-current-selector($expected)`, `assert-selectors($expected)`, `assert-defined($name)`, `assert-not-null($value)`, `assert-json($path, $expected)` | Test Stylus-specific types, units, selectors, symbols, local values, and JSON fixtures. |
| CSS output assertions | `assert($description)`, `output()`, `expect()`, `contains()`, `contains-string($string)`                                                                                                                                                           | Emit CSS assertion blocks for JavaScript runner comparison.                             |
| Errors                | `true-error($message, $source, $catch)`                                                                                                                                                                                                            | Throw or catch testable error messages.                                                 |
| Reporting             | `report($terminal, $fail-on-error)`                                                                                                                                                                                                                | Emit a summary to CSS comments and optionally the terminal.                             |

Value assertions are evaluated by Stylus during compilation. CSS output assertions are emitted into compiled CSS and compared by the JavaScript runner integration.

## Setting

`$true-terminal-output.value` is a boolean and defaults to `false`.

- `false` turns off direct terminal output from Stylus. Mocha and Vitest still report through their normal runner output.
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

Explicit assertion descriptions are emitted in compiled comments, for example `assert-equal(1, 1, 'numbers match')` outputs `✔ [assert-equal] numbers match`. When omitted, value assertions output the assertion type only.

## Stylus-Specific Assertions

These assertions cover Stylus features that Sass True does not expose:

```stylus
+test('uses Stylus type and unit introspection') {
  assert-type(10px, 'unit');
  assert-unit(50%, '%');
  assert-unit(10, '');
}
```

`assert-type($value, $expected-type)` compares `type($value)` to an exact string such as `'unit'`, `'string'`, `'rgba'`, `'object'`, or `'function'`. Pass type names as strings; bare names such as `unit` can resolve to Stylus built-in functions.

`assert-unit($value, $expected-unit)` compares `unit($value)` for unit values without throwing on non-unit values. Use `''` for unitless numbers and `'%'` for percentages.

`assert-selector($selector)` checks `selector-exists($selector)`. It searches Stylus's compiled selector map, so pass the full selector you expect to exist.

```stylus
.card
  &:hover
    define('hover-selector', selector(), true)

+test('generated hover selector exists') {
  assert-selector(lookup('hover-selector'));
}
```

Use `assert-current-selector($expected)` and `assert-selectors($expected)` when the current selector context or selector stack is what you are testing:

```stylus
.card
  &:hover
    assert-current-selector('.card:hover');
    assert-selectors('.card' '&:hover');
```

`assert-defined($name)` checks that `lookup($name)` returns a non-null value. It covers variables, functions, and values created with `define()`. Stylus `lookup()` cannot distinguish a missing symbol from a symbol intentionally set to `null`, and symbols local to the caller's block may not be visible inside the assertion helper; prefer top-level fixtures or `define($name, $value, true)` for tests that need explicit lookup visibility.

Use `assert-not-null($value)` for local values that should be checked directly instead of resolved by name:

```stylus
+test('local value') {
  $local-value = 12px;

  assert-not-null($local-value);
}
```

`assert-json($path, $expected, $description = null, $options = null)` loads a JSON file through Stylus `json()` and compares the resulting hash object to `$expected`. Options default to `{ hash: true, leave-strings: true }`; caller options are copied without mutation and `hash` is always forced to `true`.

For mixin-introspection behavior, use Stylus built-ins directly inside value assertions:

```stylus
helper()
  assert-true(mixin);
```

There is no `assert-mixin()` wrapper because wrapping Stylus's `mixin` local would change the context being tested.

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

CSS output assertions are parsed with PostCSS in the JavaScript runner. `expect()` requires the compiled CSS to match the expected block after normalized CSS serialization, so selector and declaration order remain significant. `contains()` is a structural subset check: expected rules, declarations, comments, and at-rules must exist in the output, but declaration order inside a matching rule does not matter. `contains-string()` passes when the compiled output includes a case-sensitive substring.

`contains()` compares selectors as normalized strings, not as selector algebra. For example, `.a, .b` and `.b, .a` are treated as different selectors even though browsers match the same elements. Modern selector syntax such as `:is()`, `:where()`, `:not()`, and `:has()` is parsed safely, including commas inside pseudo-class arguments.

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

Use `runStyl(stylOptions, trueOptions)` from `stylus-true/lib/main.js` to compile Stylus tests and map the parsed results to a runner's `describe` and `it` functions. Use `renderStyl(stylOptions, trueOptions)` when you want compilation, parsing, dependency reporting, and module data without invoking runner callbacks.

```js
const path = require("path");
const glob = require("glob");
const stylTrue = require("stylus-true/lib/main.js");

describe("Stylus tests", () => {
  const stylTestFiles = glob.sync(
    path.resolve(process.cwd(), "**/*.spec.styl")
  );

  stylTestFiles.forEach((file) => {
    const result = stylTrue.runStyl({ file }, { describe, it });
    console.log(result.deps);
  });
});
```

Both functions return `{ css, modules, deps }`. `runStyl()` still invokes `describe` and `it`; `renderStyl()` does not. `deps` is collected from Stylus `.deps()` when the real Stylus renderer is used and falls back to `[]` for injected render mocks that do not expose dependency data.

`runStyl` and `renderStyl` accept Stylus render options such as `file`, `data`, `filename`, `includePaths`, `paths`, `use`, and `compress`. Native `use` entries are renderer plugin functions and may be a single function or an array. `pluginPaths` is also supported for CLI-style plugin factories:

```js
stylTrue.runStyl(
  {
    file,
    pluginPaths: [
      { path: "./test/styl/plugins/theme-plugin.js", options: { scale: 2 } },
    ],
  },
  { describe, it }
);
```

Each `pluginPaths` entry loads a module that exports a factory function. The factory is called with the provided options and must return a Stylus renderer plugin function. Relative plugin paths resolve from `stylOptions.filename` when available, otherwise from `process.cwd()`. Package names resolve through Node `require`.

The second argument accepts `describe`, `it`, `contextLines`, injected `styl`, and `onDeps(deps, result)`. `onDeps` runs after compilation when dependency data is available, which is useful for watch-mode tooling and future CLI runners.

## Compatibility

| Environment                   | Status                        | Notes                                                                                                                      |
| ----------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Node.js                       | Supported on Node `>=22.22.2` | The current test stack targets Node 22.22.2 and newer compatible Node releases.                                            |
| Stylus `0.64.0`               | Supported                     | Direct compilation and package-internal plugin paths are covered by tests.                                                 |
| Standalone Stylus compiler    | Supported with limits         | Value assertions and reports compile to comments. CSS output assertions need manual review unless a JS runner parses them. |
| Stylus CLI                    | Supported                     | Use the same `@require` entrypoint; enable terminal output with `$true-terminal-output.value = true` or `report(true)`.    |
| Mocha                         | Supported and tested          | The repository runs `npm run test:mocha`.                                                                                  |
| Vitest                        | Supported and tested          | The repository runs `npm run test:vitest` with Vitest 4.                                                                   |
| Other `describe`/`it` runners | Compatible in principle       | Any runner exposing `describe` and `it` can use `runStyl`, but Mocha and Vitest are the tested integrations.               |
| Stylus plugins                | Supported                     | Direct Stylus `use()` calls, `runStyl({ use })`, and CLI-style `runStyl({ pluginPaths })` are supported.                   |
| Dependency reporting          | Supported                     | `renderStyl()` and `runStyl()` return Stylus `.deps()` data and support `trueOptions.onDeps`.                              |
| CLI runner                    | Deferred                      | The reusable renderer/parser/dependency layer exists, but `stylus-true` does not yet ship a standalone file-discovery CLI. |

## Stylus Limitations

Stylus evaluates nested block contents before wrapper mixins. `runStyl()` supports nested `test-module()`/`describe()` and `test()`/`it()` structures by parsing private `TRUE_MODULE_*` and `TRUE_TEST_*` marker comments from compiled CSS, then reconstructing the hierarchy in JavaScript. Private live context reads such as `_true-context('module')` inside nested wrapper bodies are not a public guarantee.

CSS output assertions should still use an `assert()` wrapper. `runStyl()` and `renderStyl()` parse compiled CSS and report stray `output()`, `expect()`, `contains()`, `contains-string()`, or `END_ASSERT` markers outside an assertion. The standalone Stylus compiler can emit those marker comments before it has enough wrapper context to reject every malformed assertion, so parser-backed JS runner validation is the strict mode.

Stylus introspection helpers work inside Stylus's own scope rules. `assert-selector()` checks the global selector map with `selector-exists()`. Use `assert-current-selector()` or `assert-selectors()` for current selector context, and use `assert-not-null($value)` for local values that `lookup($name)` cannot reliably inspect by name.

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

See [STYLUS-LIMITATIONS.MD](STYLUS-LIMITATIONS.MD) for details.

## Acknowledgements

stylus-true exists because of the design and prior art in [True](https://github.com/oddbird/true).
