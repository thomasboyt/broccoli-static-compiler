/* jshint asi: true */

var path = require('path')
var mkdirp = require('mkdirp')
var helpers = require('broccoli-kitchen-sink-helpers')
var Writer = require('broccoli-writer')
var globSync = require('glob').sync

module.exports = StaticCompiler
StaticCompiler.prototype = Object.create(Writer.prototype)
StaticCompiler.prototype.constructor = StaticCompiler
function StaticCompiler (inputTree, options) {
  if (!(this instanceof StaticCompiler)) return new StaticCompiler(inputTree, options)
  this.inputTree = inputTree
  this.options = options || {}
}

StaticCompiler.prototype.write = function (readTree, destDir) {
  var self = this

  return readTree(this.inputTree).then(function (srcDir) {
    if (self.options.files == null) {
      helpers.copyRecursivelySync(
        path.join(srcDir, self.options.srcDir),
        path.join(destDir, self.options.destDir))
    } else {
      var baseDir = path.join(srcDir, self.options.srcDir)
      var files = multiGlob(self.options.files, {
        cwd: baseDir,
        root: baseDir,
        nomount: false
      })
      for (var i = 0; i < files.length; i++) {
        mkdirp.sync(path.join(destDir, self.options.destDir, path.dirname(files[i])))
        helpers.copyPreserveSync(
          path.join(srcDir, self.options.srcDir, files[i]),
          path.join(destDir, self.options.destDir, files[i]))
      }
    }
  })
}

function multiGlob(globs, globOptions) {
  var options = {
    nomount: true,
    strict: true
  }
  for (var key in globOptions) {
    if (globOptions.hasOwnProperty(key)) {
      options[key] = globOptions[key]
    }
  }

  var pathSet = {}
  var paths = []

  for (var i = 0; i < globs.length; i++) {
    var glob = globs[i];

    // handle exclusion patterns ('!foo.js')
    var exclusion = glob.indexOf('!') === 0
    if (exclusion) {
      glob = glob.slice(1);
    }

    if (options.nomount && glob[0] === '/') {
      throw new Error('Absolute paths not allowed (`nomount` is enabled): ' + globs[i])
    }
    var matches = globSync(glob, options)
    if (matches.length === 0) {
      throw new Error('Path or pattern "' + glob + '" did not match any files')
    }

    var j
    if (exclusion) {
      for (j = 0; j < matches.length; j++) {
        if (pathSet[matches[j]]) {
          // remove excluded glob from paths
          paths.push(matches[j])
          paths.splice(paths.indexOf(matches[j]), 1);
        } else {
          // mark as included so no further glob will try to append it
          pathSet[matches[j]] = true
        }
      }
    } else {
      for (j = 0; j < matches.length; j++) {
        if (!pathSet[matches[j]]) {
          pathSet[matches[j]] = true
          paths.push(matches[j])
        }
      }
    }
  }
  return paths
}
