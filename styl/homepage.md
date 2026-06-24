# stylus-true support overview

stylus-true is a unit-testing framework for Stylus code. Tests are written in Stylus and can be compiled directly or bridged into JavaScript runners through `runStyl()`.

## Public API

| Area                  | API                                                                                                                                                | Purpose                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Structure             | `test-module($name)`, `describe($name)`                                                                                                            | Group related tests.                                                      |
| Tests                 | `test($name)`, `it($name)`                                                                                                                         | Define a single test case.                                                |
| Value assertions      | `assert-true($value)`, `assert-false($value)`, `assert-equal($actual, $expected)`, `assert-unequal($actual, $expected)`                            | Compare Stylus values during compilation.                                 |
| Value aliases         | `is-truthy($value)`, `is-falsy($value)`, `is-equal($actual, $expected)`, `not-equal($actual, $expected)`                                           | sass-true-compatible aliases for value assertions.                        |
| Stylus assertions     | `assert-type($value, $type)`, `assert-unit($value, $unit)`, `assert-selector($selector)`, `assert-defined($name)`, `assert-json($path, $expected)` | Test Stylus-specific types, units, selectors, symbols, and JSON fixtures. |
| CSS output assertions | `assert($description)`, `output()`, `expect()`, `contains()`, `contains-string($string)`                                                           | Emit CSS assertion blocks for JavaScript runner comparison.               |
| Errors                | `true-error($message, $source, $catch)`                                                                                                            | Throw or catch testable error messages.                                   |
| Reporting             | `report($terminal, $fail-on-error)`                                                                                                                | Emit a summary to CSS comments and optionally the terminal.               |

`$catch-errors.value` defaults to `false`. Set it to `true` to make `true-error()` return strings from functions or emit CSS comments from mixin calls; set it to `'warn'` to catch and warn.

## Stylus-specific feature layer

`assert-type()`, `assert-unit()`, `assert-selector()`, `assert-defined()`, and `assert-json()` test Stylus semantics directly. Pass type names as strings, for example `assert-type(10px, 'unit')`; use `assert-unit(10, '')` for unitless numbers and `assert-unit(50%, '%')` for percentages.

`assert-selector()` checks `selector-exists()` and is not current-context relative. Use Stylus introspection such as `selector()` or `selectors()` directly in assertions when the current selector stack matters. Use `assert-defined()` for `lookup()` and `define()` behavior, with the Stylus limitation that `lookup()` cannot distinguish a missing symbol from a symbol set to `null`.

`assert-json()` loads fixtures through Stylus `json()`, defaults to `{ hash: true, leave-strings: true }`, copies caller options, and always forces `hash: true`.

`renderStyl()` compiles and parses without invoking runner callbacks, and `runStyl()` still invokes `describe`/`it`. Both return `{ css, modules, deps }`, both support `trueOptions.onDeps(deps, result)`, and both support native renderer plugins through `use` plus CLI-style plugin factories through `pluginPaths`.

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
| Stylus plugins             | Supported                | Direct Stylus `use()` calls, `runStyl({ use })`, and CLI-style `runStyl({ pluginPaths })` are supported.                   |
| Dependency reporting       | Supported                | `renderStyl()` and `runStyl()` return Stylus `.deps()` data and support `trueOptions.onDeps`.                              |
| CLI runner                 | Deferred                 | The reusable renderer/parser/dependency layer exists, but `stylus-true` does not yet ship a standalone file-discovery CLI. |

## Known limits

Stylus evaluates nested block contents before wrapper mixins. `runStyl()` supports nested `test-module()`/`describe()` and `test()`/`it()` structures by parsing private `TRUE_MODULE_*` and `TRUE_TEST_*` marker comments, then reconstructing the hierarchy in JavaScript. Private live context reads such as `_true-context('module')` inside nested wrapper bodies are not a public guarantee.

CSS output assertions should still use an `assert()` wrapper. The JavaScript parser reports stray `output()`, `expect()`, `contains()`, `contains-string()`, or `END_ASSERT` markers outside an assertion, but the standalone Stylus compiler cannot always reject a missing wrapper before CSS is emitted.

The JavaScript runner parses CSS output assertions with PostCSS. `expect()` compares normalized serialized CSS exactly, while `contains()` performs structural subset matching for rules, declarations, comments, and at-rules. Selectors are compared as normalized strings rather than selector algebra, so `.a, .b` and `.b, .a` are not equivalent.

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
