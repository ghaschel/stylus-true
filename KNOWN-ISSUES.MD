# Known Issues

stylus-true works within Stylus evaluation rules, which differ from True's Sass environment in a few important ways.

## Live Nested Context Reads

Stylus evaluates block contents before the wrapper mixins that contain them. `runStyl()` supports nested modules and tests by parsing private `TRUE_MODULE_*` and `TRUE_TEST_*` marker comments from compiled CSS, then reconstructing the hierarchy in JavaScript. JavaScript runners can still receive nested `describe()` and `it()` calls even when Stylus live context order is different from source order.

The remaining limitation is private live context inspection inside nested wrapper bodies. For example, assertions that directly read `_true-context('module')` inside nested blocks can still observe Stylus evaluation order instead of source nesting:

```stylus
+describe('outer module') {
  +describe('inner module') {
    +it('first case') {
      assert-equal(
        zip(a b c, 1 2 3),
        (a 1, b 2, c 3)
      );

      assert-unequal(
        zip(a b c, 1 2 3),
        (a 1, b 2, c 3s)
      );
    }
  }
}
```

Sass/True evaluates the wrapper structure before the assertions. Stylus can evaluate assertion bodies first, so private context helpers are best-effort internals rather than a public API for nested runtime inspection. The parser-visible markers are the authoritative source for JavaScript runner nesting.

## CSS Output Assertion Validation

The original validation model expected `assert()` to be known before `output()`, `expect()`, `contains()`, or `contains-string()` run. Stylus evaluation order means the standalone compiler cannot always detect a missing wrapper before CSS is emitted. `runStyl()` does report stray output assertion markers outside an `assert()` block while parsing compiled CSS.

Always use this safe structure:

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

You can replace `expect()` with `contains()` when the output only needs to include specific selectors or declarations:

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

`assert-selector()` uses Stylus `selector-exists()` and is not relative to the caller's current selector context. Pass the full selector string you want to check. If you need the current context, capture it with Stylus `selector()` or `selectors()` and assert against that value directly.

`assert-defined()` uses Stylus `lookup()` from inside the assertion helper. This works well for top-level variables, functions, and symbols created with `define($name, $value, true)`, but local variables from the caller's block are not guaranteed to be visible after the helper call crosses mixin/function scope. Stylus also returns `null` for both missing symbols and symbols intentionally set to `null`, so those cases cannot be distinguished by `assert-defined()`.
