var gulp = require("gulp");
var sass = require("gulp-sass");
var sassGlob = require("gulp-sass-glob");
var browserSync = require("browser-sync");
var postcss = require("gulp-postcss");
var autoprefixer = require("autoprefixer");
var concat = require("gulp-concat");
var sourcemaps = require("gulp-sourcemaps");
var rename = require('gulp-rename');

gulp.task("browser-sync", function() {
	browserSync.init({
		server: "./",
		online: false,
		open: true,
		ghostMode: false
	});
	gulp.watch("./*.html").on("change", browserSync.reload);
});

gulp.task("sass", function() {
	var processors = [autoprefixer];
	return gulp
		.src("scss/*.scss")
		.pipe(sourcemaps.init())
        .pipe(sassGlob())
		.pipe(sass().on('error', sass.logError))
		.pipe(postcss(processors))
        .pipe(rename('main.css'))
		.pipe(gulp.dest("./"))
		.pipe(browserSync.stream({ match: "./*.css" }));
});

gulp.task("concat-modules", function() {
	return gulp
        .src("js/*.js")
		.pipe(
			sourcemaps.init({
				loadMaps: true
			})
		)
		.pipe(concat("main.js"))
        .pipe(gulp.dest("./"))
});

gulp.task("generate", [
    "sass",
	"concat-modules",
]);

gulp.task("watch", ["browser-sync", "generate"], function() {
    gulp.watch("scss/*.scss", ["sass"]);
    gulp.watch("js/*.js", ["concat-modules"]);
});

gulp.task("default", ["watch"]);