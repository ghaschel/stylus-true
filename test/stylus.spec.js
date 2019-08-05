const path = require("path");
const stylTrue = require("../lib/main.js");
const glob = require("glob");

describe("stylus-true", () => {
  const stylTestFiles = glob.sync(
    path.resolve(process.cwd(), "test/styl/test.styl")
  );

  stylTestFiles.forEach(file => stylTrue.runStyl({ file }, { describe, it }));
});
