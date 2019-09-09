# Known Issues

There are some technical issues with stylus-true:

Think of the stylesheet as a tree. Stylus, differently from sass, starts from the leaf to root

eg.:

```stylus
+describe('describe 1') {
   // Test 1
   +describe('describe 2') {
    +it('it 1') {
      assert-equal(
        zip(a b c, 1 2 3),
        (a 1, b 2, c 3)
      );

      assert-unequal(
        zip(a b c, 1 2 3),
        (a 1, b 2, c 3s)
      );
    }

    +it('it 2') {
      assert-unequal(
        zip(a b c, 1 2 3),
        (a 1, b 2, c 3)
      );

      assert-equal(
        zip(a b c, 1 2 3),
        (a 1, b 2, c 3)
      );
    }
   }
}
```
Scss would run it the logical way: `describe 1` -> `describe 2` -> `it1` -> `asert-equal` -> `assert-unequal` -> `it2` -> `assert-unequal` -> `assert-equal`
The way stylus parses this is `assert-equal` -> `assert-unequal` -> `it1` -> `assert-unequal` -> `assert-equal` -> `it2` -> `describe 2` -> `describe 1`

This breaks any logical way of keeping track of any viable architecture and logical link between the data.

This issue actually broke down a validation that was in the original code that kept the file from compiling if no `assert` was added before `expect/output/contains`
So make sure to always include an `assert` before your `expect/contains/output`

eg.:

```stylus
 ```stylus
+test('Stylus math compiles before output') {
  +assert() { // That validation granted this was added to the code
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