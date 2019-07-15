const gulp = require('gulp')
const ts = require('gulp-typescript')
const tsProject = ts.createProject('tsconfig.json')
const package = require('./package.json')
const homedir = require('os')
  .homedir()
  .replace('\\', '/')

function watch() {
  return gulp.watch('./src/**/*.ts', gulp.series(['compile', 'copy']))
}

function compile() {
  const tsResult = gulp.src('src/**/*.ts').pipe(tsProject())

  return tsResult.js.pipe(gulp.dest('dist'))
}

gulp.task('copy', () => {
  return gulp
    .src('./dist/**/*.js')
    .pipe(
      gulp.dest(
        `${homedir}/.vscode/extensions/${package.name}-${package.version}/dist`
      )
    )
})

gulp.task('compile', () => {
  return compile()
})

gulp.task('watch', () => {
  return watch()
})

gulp.task('default', () => {
  return watch()
})
