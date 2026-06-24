# stylus-true support overview

stylus-true is a unit-testing framework for Stylus code. Tests are written in Stylus and can be compiled directly or bridged into JavaScript runners through `runStyl()`.

## Public API

| Area                  | API                                                                                                                     | Purpose                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Structure             | `test-module($name)`, `describe($name)`                                                                                 | Group related tests.                                        |
| Tests                 | `test($name)`, `it($name)`                                                                                              | Define a single test case.                                  |
| Value assertions      | `assert-true($value)`, `assert-false($value)`, `assert-equal($actual, $expected)`, `assert-unequal($actual, $expected)` | Compare Stylus values during compilation.                   |
| Value aliases         | `is-truthy($value)`, `is-falsy($value)`, `is-equal($actual, $expected)`, `not-equal($actual, $expected)`                | sass-true-compatible aliases for value assertions.          |
| CSS output assertions | `assert($description)`, `output()`, `expect()`, `contains()`, `contains-string($string)`                                | Emit CSS assertion blocks for JavaScript runner comparison. |
| Errors                | `true-error($message, $source, $catch)`                                                                                 | Throw or catch testable error messages.                     |
| Reporting             | `report($terminal, $fail-on-error)`                                                                                     | Emit a summary to CSS comments and optionally the terminal. |

`$catch-errors.value` defaults to `false`. Set it to `true` to make `true-error()` return strings from functions or emit CSS comments from mixin calls; set it to `'warn'` to catch and warn.

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

## Known limits

Stylus evaluates nested block contents before wrapper mixins. Nested module context can therefore be unreliable, and validation cannot always detect a missing `assert()` wrapper around `output()`, `expect()`, `contains()`, or `contains-string()` before compilation.

Use this structure for CSS output assertions:

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
