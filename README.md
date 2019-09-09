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

> This is a [decremental](KNOWN-ISSUES.MD) port of [true](https://github.com/oddbird/true) for scss.

stylus-true is a unit-testing tool for [Stylus](http://stylus-lang.com) code, All of the test code is written in Stylus and JS (via stylus plugins), and can be compiled by the stylus compiler – or used alongside Javascript test runners for extra features and improved reporting.

## Install

In command line:

```bash
npm install stylus-true
```

Import in your test directory, like any other stylus file:

```stylus
@require '../node_modules/stylus-true/styl/_true.styl';
```

## One Setting

`$true-terminal-output.value` (boolean), defaults to `true`

- `true` will show detailed information in the terminal for debugging failed assertions or reporting final results. This is the default, and best for compiling without a JavaScript test runner.
- `false` will turn off all terminal output from Stylus, though Mocha/Jest will continue to use the terminal for reporting.
-

## Usage

stylus-true, just as the original, [True](https://github.com/oddbird/true) is based on common JS-testing patterns, allowing both a `test-module`/`test` syntax, and the newer `describe`/`it` for defining the structure:

```stylus
+test-module('zip [function]') {
    // Test 1
     +test('Returns two lists zipped together') {
        assert-equal(
            zip(a b c, 1 2 3),
            (a 1, b 2, c 3)
        );
    }
}
```

This is the same as...

```stylus
+describe('zip [function]') {
    // Test 1
     +it('Returns two lists zipped together') {
        assert-equal(
            zip(a b c, 1 2 3),
            (a 1, b 2, c 3)
        );
    }
}
```

Stylus is able to compare values internally, meaning function-output and variable values can easily be compared and reported during Stylus compilation.

CSS output tests, on the other hand, have to be compared after compilation is complete. You can do that by hand if you want (`git diff` is helpful for noticing changes), or you can use our [Mocha](https://mochajs.org/) or [Jest](https://jestjs.io/) integration.

Output tests fit the same structure, but assertions take a slightly different form, with an outer `assert` mixin, and a matching pair of `output` and `expect` to contain the output-values.

```stylus
// Test CSS output from mixins
+it('Outputs a font size and line height based on keyword') {
  +assert() {
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

You can optionally show a summary report in CSS and/or the command line, after the tests have completed:

```stylus
report();
```

## Using Mocha, Jest, or other JS test runners

1. Install `stylus-true` via npm:

   ```bash
   npm install --save-dev stylus-true
   ```

2. Write some Stylus tests in `**/*.spec.styl` (see above).

3. Write a shim JS test file `stylus.spec.js`:

   ```js
   const path = require("path");
   const stylTrue = require("./lib/main.js");
   const glob = require("glob");

   describe("SaStylusss", () => {
     const stylTestFiles = glob.sync(
       path.resolve(process.cwd(), "*.spec.styl")
     );

     stylTestFiles.forEach(file =>
       stylTrue.runStyl({ file }, { describe, it })
     );
   });
   ```

4. Run Mocha/Jest, and see your Sass tests reported in the command line.

You can call `runStyl` more than once, if you have multiple Styl test files you want to run separately.

The second argument is an object with required `describe` and `it` options, and optional and `contextLines` options.

Any JS test runner with equivalents to Mocha's or Jest's `describe` and `it` should be usable in the same way: just pass your test runner's `describe` and `it` equivalents in the second argument to `runStyl`.

If True can't parse the CSS output, it'll give you some context lines of CSS as part of the error message. This context will likely be helpful in understanding the parse failure. By default it provides up to 10 lines of context; if you need more, you can provide a numeric `contextLines` option: the maximum number of context lines to provide.

## Disclaimer

stylus-true wouldn't exist if it wasn't for [oddbird](https://github.com/oddbird)'s amazing job with the original true, so give her some love <3
