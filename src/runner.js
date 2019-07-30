import glob from "glob";
import lodash from "lodash";

import getTests from "./parser";
import stylusRenderer from "./stylus";
import { isEmptyFile } from "./utils"; /* jshint ignore:start */ /* eslint-enable */

/* eslint-disable */ /* jshint ignore:end */ /**
 * Search for all tests.
 *
 * @param  {Array}    config
 * @param  {Function} callback
 *
 * @return {[type]}
 */
function forEachTest(config, callback) {
  const testFiles = lodash.reject(
    glob.sync(config.testDirPath + "/**/*.styl"),
    isEmptyFile
  );

  lodash.each(lodash.flatten(lodash.map(testFiles, getTests)), callback);
}

/**
 * Run stylus tests by mocha.
 *
 * @param  {Array} config
 *
 * @return {[type]}
 */
export default function(config) {
  describe(config.describe, function() {
    forEachTest(config, function(test) {
      it(test.description, function() {
        stylusRenderer(test.givenStylus, config.stylus, function(actualCss) {
          actualCss.should.equal(test.expectedCss);
        });
      });
    });
  });
}
