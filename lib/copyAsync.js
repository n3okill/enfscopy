/**
 * @project enfscopy
 * @filename copyAsync.js
 * @description async method to copy items in the file system
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2016 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 18-02-2016.
 * @version 0.0.2
 */


"use strict";


const nodePath = require("path");
const nodeEvents = require("events");
const utimes = require("./utimes");
const enFs = require("enfspatch");
const enfsmkdirp = require("enfsmkdirp").mkdirp;
const enfsfind = require("enfsfind").find;

function noop() {
}


const kindOf = (arg) => arg === null ? "null" : typeof arg === "undefined" ? "undefined" : /^\[object (.*)\]$/.exec(Object.prototype.toString.call(arg))[1].toLowerCase();
const isFunction = (arg) => "function" === kindOf(arg);
const isRegExp = (arg) => "regexp" === kindOf(arg);
const isArray = (arg) => Array.isArray(arg);

class CopyFiles extends nodeEvents {
    constructor(src, dst, options, callback) {
        super();
        this.options = options;
        this.callback = (((self) => {
            return function () {
                if (!self.callbackCalled) {
                    self.callbackCalled = true;
                    callback.apply(null, arguments);
                }
            };
        })(this));
        this.callbackCalled = false;
        this.basePath = process.cwd();
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

    defineEvents() {
        this.on("error", noop);
    }

    onError(err) {
        this.hasErrors = true;
        this.emit("error", err);
        this.statistics.errors++;
        if (this.options.stopOnError) {
            return this.callback(err);
        } else {
            if (isArray(this.errors)) {
                this.errors.push(err);
            } else {
                this.errors.write(err.stack + "\n");
            }
        }
        this.done();
    }


    start() {
        if (this.src === this.dst) {
            return this._end();
        }
        if ((this.dst + nodePath.sep).indexOf(this.src + nodePath.sep) === 0) {
            let e = new Error("Error trying to copy. 'destination' is a sub-directory of 'source'");
            e.code = "ESELF";
            return this.callback(e);
        }
        this.stat(this.src, (err) => {
            if (err) {
                return this.onError(err);
            }
            this.mkdirp(nodePath.dirname(this.dst), {fs: this.options.fs}, (errMkDir) => {
                if (errMkDir) {
                    return this.onError(errMkDir);
                }
                this.loadItems();
            });
        });
    }

    loadItems() {
        enfsfind(this.src, {
            fs: this.options.fs,
            filter: this.options.filter,
            dereference: this.options.dereference
        }, (err, items) => {
            if (err) {
                return this.onError(err);
            }
            if (items.length === 0) {
                return this._end();
            }
            this.itemsToCopy = items;
            this.loadStatistics(items);
        });
    }


    loadStatistics(items) {
        this.statistics.items = items.length;
        items.filter((item) => {
            return item.stat.isFile();
        }).forEach((item) => {
            this.statistics.size += item.stat.size;
        });
        this.startCopy();
    }

    startCopy() {
        this.emit("start");
        this.itemsToCopy.forEach((item) => {
            this.copyItem(item);
        });
    }

    copyItem(item) {
        this.started++;
        if (this.running >= this.options.limit) {
            return setImmediate(() => {
                this.copyItem(item);
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
    }

    done(skipped) {
        if (!skipped) {
            this.running--;
        }
        this.finished++;
        if ((this.started === this.finished) && (this.running === 0)) {
            this._end();
        }
    }

    _end() {
        this.emit("end", this.statistics);
        this.callback(this.hasErrors ? this.errors : null, this.statistics);
    }

    isWritable(path, callback) {
        this.stat(path, (err) => {
            if (err) {
                if (err.code === "ENOENT") {
                    return callback(true);
                }
            }
            return callback(false);
        });
    }


    onDir(item) {
        const target = item.path.replace(this.src, this.dst);
        this.mkdirp(target, {fs: this.options.fs, mode: item.stat.mode}, (err) => {
            if (err) {
                return this.onError(err);
            }
            this.statistics.copied.directories++;
            this.options.fs.chmod(target, item.stat.mode, (errChmod) => {
                if (errChmod) {
                    return this.onError(errChmod);
                }
                this.emit("copied", item, this.statistics);
                this.done();
            });
        });
    }

    onFile(item) {
        const target = item.path.replace(this.src, this.dst);
        this.mkdirp(nodePath.dirname(target), () => {
            this.isWritable(target, (writable) => {
                if (writable) {
                    this.copyFile(item, target);
                } else {
                    if (this.options.overwrite && item.path !== target) {
                        this.rmFile(target, () => {
                            this.copyFile(item, target);
                        });
                    } else {
                        this.done();
                    }
                }
            });
        });
    }

    rmFile(target, callback) {
        this.options.fs.unlink(target, (err) => {
            if (err) {
                return this.onError(err);
            }
            this.emit("removed", target);
            this.statistics.overwrited++;
            return callback();
        });
    }


    copyFile(item, target) {
        const readStream = this.options.fs.createReadStream(item.path);
        const writeStream = this.options.fs.createWriteStream(target, {mode: item.stat.mode});

        readStream.on("error", (err) => {
            this.onError(err);
        });
        writeStream.on("error", (err) => {
            this.onError(err);
        });

        writeStream.on("open", function () {
            readStream.pipe(writeStream);
        });


        writeStream.once("finish", () => {
            this.statistics.copied.files++;
            this.statistics.copied.size += item.stat.size;
            this.options.fs.chmod(target, item.stat.mode, (err) => {
                if (err) {
                    return this.onError(err);
                }
                if (this.options.preserveTimestamps) {
                    utimes.utimesMillis(this.options.fs, target, item.stat.atime, item.stat.mtime, (errUTimes) => {
                        if (errUTimes) {
                            return this.onError(errUTimes);
                        }
                        this.emit("copied", item, this.statistics);
                        this.done();
                    });
                } else {
                    this.emit("copied", item, this.statistics);
                    this.done();
                }
            });
        });
    }

    onLink(item) {
        const target = item.path.replace(this.src, this.dst);
        this.options.fs.readlink(item.path, (err, resolvedPath) => {
            if (err) {
                return this.onError(err);
            }
            this.checkLink(resolvedPath, target, item);
        });
    }

    checkLink(resolvedPath, target, item) {
        if (this.options.dereference) {
            resolvedPath = nodePath.resolve(this.basePath, resolvedPath);
        }
        if (resolvedPath === target) {
            this.emit("copied", item, this.statistics);
            return this.done();
        }
        this.isWritable(target, (writable) => {
            if (writable) {
                return this.makeLink(resolvedPath, target, item);
            }
            this.options.fs.readlink(target, (err, targetDst) => {
                if (err) {
                    if (err.code === "EINVAL") {
                        this.emit("copied", item, this.statistics);
                        return this.done();
                    }
                    return this.onError(err);
                }
                if (this.options.dereference) {
                    targetDst = nodePath.resolve(this.basePath, targetDst);
                }
                if (targetDst === resolvedPath) {
                    this.emit("copied", item, this.statistics);
                    return this.done();
                }
                return this.rmFile(target, function () {
                    this.makeLink(resolvedPath, target, item);
                });
            });
        });
    }

    makeLink(resolvedPath, target, item) {
        this.options.fs.symlink(resolvedPath, target, (err) => {
            if (err) {
                return this.onError(err);
            }
            this.statistics.copied.links++;
            this.emit("copied", item, this.statistics);
            this.done();
        });
    }
}


/**
 * Copy items in the file system async
 * @param {string} src - the path to be copied
 * @param {string} dst - the destination path for the items
 * @param {object} opt - various options for copy module
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
function copy(src, dst, opt, callback) {
    let options;

    if (isFunction(opt) && !callback) {
        callback = opt;
        opt = {};
    }
    if (isFunction(opt) || isRegExp(opt)) {
        opt = {filter: opt};
    }

    callback = callback || noop;
    options = opt || {};
    options.fs = options.fs || enFs;
    options.limit = options.limit || enFs.limit || 512;
    options.overwrite = options.overwrite === true;
    options.preserveTimestamps = options.preserveTimestamps === true;
    options.stopOnError = options.stopOnError !== false;
    options.dereference = options.dereference === true;
    options.errors = options.errors || null;
    return new CopyFiles(src, dst, options, callback);
}


module.exports = copy;