# Known Issues

stylus-true works within Stylus evaluation rules, which differ from True's Sass environment in a few important ways.

## Nested Module Context

Stylus evaluates block contents before the wrapper mixins that contain them. For nested modules, that can make context tracking unreliable because assertions may run before the surrounding `describe()` or `test-module()` state has been recorded.

For example, this structure can produce assertion output before the nested module wrappers are fully available:

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

Sass/True evaluates the wrapper structure before the assertions. Stylus can evaluate assertion bodies first, which makes deeply nested module labels less reliable in the current implementation.

## CSS Output Assertion Validation

The original validation model expected `assert()` to be known before `output()`, `expect()`, or `contains()` run. Stylus evaluation order means that validation cannot always detect a missing wrapper before compilation.

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
