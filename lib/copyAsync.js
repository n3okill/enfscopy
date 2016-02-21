/**
 * @project enfscopy
 * @filename copyAsync.js
 * @description async method to copy items in the file system
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2016 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 18-02-2016.
 * @version 0.0.1
 */


"use strict";


var nodePath = require("path"),
    nodeUtil = require("util"),
    nodeProcess = process,
    nodeEventEmitter = require("events").EventEmitter,
    utimes = require("./utimes"),
    enFs = require("enfspatch"),
    enfsmkdirp = require("enfsmkdirp").mkdirp,
    enfsfind = require("enfsfind").find;

function noop() {
}

/**
 * Copy items in the file system async
 * @param {string} src - the path to be copied
 * @param {string} dst - the destination path for the items
 * @param {object} options - various options for copy module
 *              {object} fs - the fs module to be used
 *              {limit} limit - the maximum number of items being copied at same time
 *              {bool} overwrite - if true will overwrite destination items if existent
 *              {bool} preserveTimestamps - if true will preserve the timestamps of copied items
 *              {bool} stopOnError - if true will stop copying at first error
 *              {Array|WriteStream} errors - can be a array or WriteStream to where error's will be saved
 *              {bool} dereference - defines the type of stat that will be used in files
 *              {function|RegExp} filter - function or RegExp used to narrow results
 *              this function receives an object of type {path: itemPath, stat: itemStatObject}
 * @param {function} callback - the callback function that will be called after the list is done
 * @return {Error|Object} Error | Copied items statistics
 */
function copy(src, dst, options, callback) {
    if (nodeUtil.isFunction(options) && !callback) {
        callback = options;
        options = {};
    }
    if (nodeUtil.isFunction(options) || nodeUtil.isRegExp(options)) {
        options = {filter: options};
    }
    callback = callback || noop;
    options = options || {};
    options.fs = options.fs || enFs;
    options.limit = options.limit || enFs.limit || 512;
    options.overwrite = options.overwrite === true;
    options.preserveTimestamps = options.preserveTimestamps === true;
    options.stopOnError = options.stopOnError !== false;
    options.dereference = options.dereference === true;
    options.errors = options.errors || null;
    return new CopyFiles(src, dst, options, callback);
}


function CopyFiles(src, dst, options, callback) {
    nodeEventEmitter.call(this);
    this.options = options;
    this.callback = callback;
    this.basePath = nodeProcess.cwd();
    this.src = nodePath.resolve(this.basePath, src);
    this.dst = nodePath.resolve(this.basePath, dst);
    this.stat = options.dereference ? options.fs.stat : options.fs.lstat;
    this.mkdirp = options.fs.mkdirp || enfsmkdirp;
    this.itemsToCopy = [];
    this.statistics = {
        copied: {
            files: 0,
            directories: 0,
            links: 0,
            size: 0
        },
        overwrited: 0,
        skipped: 0,
        size: 0,
        errors: 0,
        items: 0
    };
    this.started = 0;
    this.running = 0;
    this.finished = 0;
    this.hasErrors = false;
    this.errors = null;
    if (!options.stopOnError) {
        if (options.errors) {
            this.errors = options.fs.createWriteStream(options.errors);
        } else {
            this.errors = [];
        }
    }
    this.defineEvents();
    this.start();
}

nodeUtil.inherits(CopyFiles, nodeEventEmitter);

CopyFiles.prototype.defineEvents = function() {
    this.on("error", noop);
};

CopyFiles.prototype.onError = function(err) {
    this.hasErrors = true;
    this.emit("error", err);
    this.statistics.errors++;
    if (this.options.stopOnError) {
        return this.callback(err);
    } else {
        if (nodeUtil.isArray(this.errors)) {
            this.errors.push(err);
        } else {
            this.errors.write(error.stack + "\n");
        }
    }
    this.done();
};


CopyFiles.prototype.start = function() {
    var self = this;
    if (this.src === this.dst) {
        return this._end();
    }
    if ((this.dst + nodePath.sep).indexOf(this.src + nodePath.sep) === 0) {
        var e = new Error("Error trying to copy. 'destination' is a sub-directory of 'source'");
        e.code = "ESELF";
        return this.callback(e);
    }
    this.stat(this.src, function(err) {
        if (err) {
            return self.onError.call(self, err);
        }
        self.mkdirp(nodePath.dirname(self.dst), {fs: self.options.fs}, function(errMkDir) {
            if (errMkDir) {
                return self.onError.call(self, errMkDir);
            }
            self.loadItems();
        });
    });
};

CopyFiles.prototype.loadItems = function() {
    var self = this;
    enfsfind(this.src, this.options.filter, function(err, items) {
        if (err) {
            return self.onError.call(self, err);
        }
        if (items.length === 0) {
            return self._end();
        }
        self.itemsToCopy = items;
        self.loadStatistics(items);
    });
};


CopyFiles.prototype.loadStatistics = function(items) {
    var self = this;
    self.statistics.items = items.length;
    items.filter(function(item) {
        return item.stat.isFile();
    }).forEach(function(item) {
        self.statistics.size += item.stat.size;
    });
    self.startCopy();
};

CopyFiles.prototype.startCopy = function() {
    var self = this;
    this.emit("start");
    this.itemsToCopy.forEach(function(item) {
        self.copyItem(item);
    });
};

CopyFiles.prototype.copyItem = function(item) {
    var self = this;
    this.started++;
    if (this.running >= this.options.limit) {
        return setImmediate(function() {
            self.copyItem.call(self, item);
        });
    }
    this.emit("startItemCopy", item);
    this.running++;
    if (item.stat.isDirectory()) {
        this.onDir(item);
    } else if (item.stat.isFile() || item.stat.isBlockDevice() || item.stat.isCharacterDevice()) {
        this.onFile(item);
    } else if (item.stat.isSymbolicLink()) {
        this.onLink(item);
    }
};

CopyFiles.prototype.done = function(skipped) {
    if (!skipped) {
        this.running--;
    }
    this.finished++;
    if ((this.started === this.finished) && (this.running === 0)) {
        this._end();
    }
};

CopyFiles.prototype._end = function() {
    this.emit("end", this.statistics);
    this.callback(this.hasErrors ? this.errors : null, this.statistics);
};

CopyFiles.prototype.isWritable = function(path, callback) {
    this.stat(path, function(err) {
        if (err) {
            if (err.code === "ENOENT") {
                return callback(true);
            }
        }
        return callback(false);
    });
};


CopyFiles.prototype.onDir = function(item) {
    var self = this, target;
    target = item.path.replace(this.src, this.dst);
    this.mkdirp(target, {fs: this.options.fs, mode: item.stat.mode}, function(err) {
        if (err) {
            return self.onError.call(self, err);
        }
        self.statistics.copied.directories++;
        self.options.fs.chmod(target, item.stat.mode, function(errChmod) {
            if (errChmod) {
                return self.onError.call(self, errChmod);
            }
            self.emit("copied", item, self.statistics);
            self.done();
        });
    });
};

CopyFiles.prototype.onFile = function(item) {
    var self = this, target;
    target = item.path.replace(this.src, this.dst);
    this.mkdirp(nodePath.dirname(target), function() {
        self.isWritable(target, function(writable) {
            if (writable) {
                self.copyFile(item, target);
            } else {
                if (self.options.overwrite && item.path !== target) {
                    self.rmFile(target, function() {
                        self.copyFile(item, target);
                    });
                } else {
                    self.done();
                }
            }
        });
    });
};

CopyFiles.prototype.rmFile = function(target, callback) {
    var self = this;
    this.options.fs.unlink(target, function(err) {
        if (err) {
            return self.onError.call(self, err);
        }
        self.emit("removed", target);
        self.statistics.overwrited++;
        return callback();
    });
};


CopyFiles.prototype.copyFile = function(item, target) {
    var self, readStream, writeStream;
    self = this;
    readStream = this.options.fs.createReadStream(item.path);
    writeStream = this.options.fs.createWriteStream(target, {mode: item.stat.mode});

    readStream.on("error", function(err) {
        self.onError.call(self, err);
    });
    writeStream.on("error", function(err) {
        self.onError.call(self, err);
    });

    writeStream.on("open", function() {
        readStream.pipe(writeStream);
    });


    writeStream.once("finish", function() {
        self.statistics.copied.files++;
        self.statistics.copied.size += item.stat.size;
        self.options.fs.chmod(target, item.stat.mode, function(err) {
            if (err) {
                return self.onError.call(self, err);
            }
            if (self.options.preserveTimestamps) {
                utimes.utimesMillis(self.options.fs, target, item.stat.atime, item.stat.mtime, function(errUTimes) {
                    if (errUTimes) {
                        return self.onError.call(self, errUTimes);
                    }
                    self.emit("copied", item, self.statistics);
                    self.done();
                });
            } else {
                self.emit("copied", item, self.statistics);
                self.done();
            }
        });
    });
};

CopyFiles.prototype.onLink = function(item) {
    var self = this, target;
    target = item.path.replace(this.src, this.dst);
    this.options.fs.readlink(item.path, function(err, resolvedPath) {
        if (err) {
            return self.onError.call(self, err);
        }
        self.checkLink(resolvedPath, target, item);
    });
};

CopyFiles.prototype.checkLink = function(resolvedPath, target, item) {
    var self = this;
    if (this.options.dereference) {
        resolvedPath = nodePath.resolve(this.basePath, resolvedPath);
    }
    if(resolvedPath===target){
        return this.done();
    }
    this.isWritable(target, function(writable) {
        if (writable) {
            return self.makeLink(resolvedPath, target, item);
        }
        self.options.fs.readlink(target, function(err, targetDst) {
            if (err) {
                if (err.code === "EINVAL") {
                    self.emit("copied", item, self.statistics);
                    return self.done();
                }
                return self.onError.call(self, err);
            }
            if (self.options.dereference) {
                targetDst = nodePath.resolve(self.basePath, targetDst);
            }
            if (targetDst === resolvedPath) {
                self.emit("copied", item, self.statistics);
                return self.done();
            }
            return self.rmFile(target, function() {
                self.makeLink(resolvedPath, target, item);
            });
        });
    });
};

CopyFiles.prototype.makeLink = function(resolvedPath, target, item) {
    var self = this;
    this.options.fs.symlink(resolvedPath, target, function(err) {
        if (err) {
            return self.onError.call(self, err);
        }
        self.statistics.copied.links++;
        self.emit("copied", item, self.statistics);
        self.done();
    });
};


module.exports = copy;
