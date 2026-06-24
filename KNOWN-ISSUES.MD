# Known Issues

stylus-true works within Stylus evaluation rules, which differ from True's Sass environment in a few important ways.

## Live Nested Context Reads

Stylus evaluates block contents before the wrapper mixins that contain them. `runStyl()` supports nested modules by parsing private `END_MODULE` boundary comments from compiled CSS, so JavaScript runners can still receive nested `describe()` calls.

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

Sass/True evaluates the wrapper structure before the assertions. Stylus can evaluate assertion bodies first, so private context helpers are best-effort internals rather than a public API for nested runtime inspection.

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
