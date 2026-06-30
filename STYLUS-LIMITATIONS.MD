# Stylus Limitations

stylus-true works within Stylus evaluation and scope rules. The JavaScript runner layer fixes the parts that can be reconstructed after compilation, but a few behaviors remain Stylus limitations rather than framework bugs.

## Nested Wrapper Context

Stylus evaluates block contents before the wrapper mixins that contain them. `runStyl()` and `renderStyl()` support nested modules and tests by parsing private `TRUE_MODULE_*` and `TRUE_TEST_*` marker comments from compiled CSS, then reconstructing the hierarchy in JavaScript. JavaScript runners can receive nested `describe()` and `it()` calls even when Stylus live context order differs from source order.

The remaining limitation is private live context inspection inside nested wrapper bodies. Assertions that directly read `_true-context('module')` inside nested blocks can observe Stylus evaluation order instead of source nesting:

```stylus
+describe('outer module') {
  +describe('inner module') {
    +it('first case') {
      assert-equal(
        zip(a b c, 1 2 3),
        (a 1, b 2, c 3)
      );
    }
  }
}
```

`_true-context*` helpers are private best-effort internals. Parser-visible markers are the authoritative source for JavaScript runner nesting.

## CSS Output Assertion Validation

CSS output assertions should use an `assert()` wrapper around one `output()` block and one comparison mode: `expect()`, `contains()`, or `contains-string()`.

`runStyl()` and `renderStyl()` parse compiled CSS and report malformed marker structures, including stray `output()`, `expect()`, `contains()`, `contains-string()`, or `END_ASSERT` markers outside an assertion. They also reject missing output blocks, missing comparison blocks, duplicate non-repeatable blocks, and mixed comparison modes.

The standalone Stylus compiler cannot always reject a missing wrapper before marker comments are emitted, because `output()`, `expect()`, and `contains()` bodies may evaluate before the surrounding wrapper state is known. Use the JavaScript parser-backed APIs when strict validation is required.

Safe structure:

```stylus
+test('Stylus math compiles before output') {
  +assert('expected CSS') {
    +output() {
      height: 100%;
      width: 14em + 2;
    }

    +expect() {
      height: 100%;
      width: 16em;
    }
  }
}
```

Use `contains()` when only part of the compiled CSS must be present:

```stylus
+test('partial output') {
  +assert('contains width') {
    +output() {
      height: 100%;
      width: 14em + 2;
    }

    +contains() {
      width: 16em;
    }
  }
}
```

## Stylus Introspection Assertions

`assert-selector()` uses Stylus `selector-exists()` and checks the compiled selector map. It is not a relative selector assertion. Pass the full selector string you expect to exist.

Use `assert-current-selector()` for `selector()` checks and `assert-selectors()` for `selectors()` checks:

```stylus
.card
  &:hover
    assert-current-selector('.card:hover')
    assert-selectors('.card' '&:hover')
```

`assert-defined()` uses Stylus `lookup()` from inside the assertion helper. This works for top-level variables, functions, and symbols created with `define($name, $value, true)`, but caller-local variables are not guaranteed to be visible after the helper call crosses mixin/function scope.

Use `assert-not-null($value)` when you need to check a local value directly:

```stylus
+test('local value') {
  $local-value = 12px;

  assert-not-null($local-value);
}
```

Stylus `lookup()` returns `null` for both missing symbols and symbols intentionally set to `null`, so `assert-defined()` cannot distinguish those cases.
