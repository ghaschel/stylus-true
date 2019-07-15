const path = require('path')
const stylTrue = require('./lib/main.js')
const glob = require('glob')

describe('SaStylusss', () => {
  const stylTestFiles = glob.sync(path.resolve(process.cwd(), '*.spec.styl'))

  stylTestFiles.forEach(file => stylTrue.runStyl({ file }, { describe, it }))
})
