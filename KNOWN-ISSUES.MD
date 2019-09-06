# Known Issues

There are some technical issues with stylus-true:

Think of the stylesheet as a tree. Stylus, differently from sass, starts from the leaf to root

eg.:

```stylus
+describe('describe 1') {
   // Test 1
   +describe('describe 2') {
    +it('Returns two lists zipped together') {
      assert-equal(
        zip(a b c, 1 2 3),
        (a 1, b 2, c 3)
      );
    }
   }
}
```

The way stylus parses this is `assert-equal` -> `it` -> `describe 2` -> `describe 1`

This breaks any way of keeping track of any module inside modules 
