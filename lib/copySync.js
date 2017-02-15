/**
 * @project enfscopy
 * @filename copySync.js
 * @description sync method to copy items in the file system
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2016 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 18-02-2016.
 * @version 0.0.2
 */


"use strict";


const nodePath = require("path");
const enFs = require("enfspatch");
const enfsmkdirp = require("enfsmkdirp").mkdirpSync;
const enfsfind = require("enfsfind").findSync;


const BUF_LENGTH = 64 * 1024;
const _buff = new Buffer(BUF_LENGTH);


const kindOf = (arg) => arg === null ? "null" : arg === undefined ? "undefined" : /^\[object (.*)\]$/.exec(Object.prototype.toString.call(arg))[1].toLowerCase();
const isFunction = (arg) => "function" === kindOf(arg);
const isRegExp = (arg) => "regexp" === kindOf(arg);


class CopyFiles {
    constructor(src, dst, options) {
        this.options = options;
        this.basePath = process.cwd();
        this.src = nodePath.resolve(this.basePath, src);
        this.dst = nodePath.resolve(this.basePath, dst);
        this.stat = options.dereference ? options.fs.statSync : options.fs.lstatSync;
        this.mkdirp = options.fs.mkdirpSync || enfsmkdirp;
        this.BUF_LENGTH = "BUF_LENGTH" in options ? options.BUF_LENGTH : BUF_LENGTH;
        this._buff = new Buffer(this.BUF_LENGTH);

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
        this.hasErrors = false;
        this.errors = null;
        if (!options.stopOnError) {
            if (options.errors) {
                this.errors = options.fs.createWriteStream(options.errors);
            } else {
                this.errors = [];
            }
        }
    }


    start() {
        if (this.src === this.dst) {
            return this.statistics;
        }
        if ((this.dst + nodePath.sep).indexOf(this.src + nodePath.sep) === 0) {
            let e = new Error("Error trying to copy. 'destination' is a sub-directory of 'source'");
            e.code = "ESELF";
            throw e;
        }

        this.stat(this.src);
        this.mkdirp(nodePath.dirname(this.dst), {fs: this.options.fs});
        this.loadItems();
    }


    loadItems() {
        const items = enfsfind(this.src, {
            fs: this.options.fs,
            filter: this.options.filter,
            dereference: this.options.dereference
        });
        if (items.length === 0) {
            return this.statistics;
        }
        this.itemsToCopy = items;
        this.loadStatistics(items);
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
        let items = this.itemsToCopy;
        do {
            const item = items.shift();
            if (item.stat.isDirectory()) {
                this.makeDir(item);
            } else if (item.stat.isFile() || item.stat.isBlockDevice() || item.stat.isCharacterDevice()) {
                this.onFile(item);
            } else if (item.stat.isSymbolicLink()) {
                this.onLink(item);
            }
        } while (items.length);
        return this.statistics;
    }


    makeDir(item) {
        const target = item.path.replace(this.src, this.dst);
        this.mkdirp(target, {fs: this.options.fs, mode: item.stat.mode});
        this.statistics.copied.directories++;
        this.options.fs.chmodSync(target, item.stat.mode);
    }


    isWritable(target) {
        try {
            this.stat(target);
        } catch (err) {
            if (err.code === "ENOENT") {
                return true;
            }
        }
        return false;
    }


    onFile(item) {
        const target = item.path.replace(this.src, this.dst);
        if (this.isWritable(target)) {
            this.copyFile(item, target);
        } else {
            if (this.options.overwrite && item.path !== target) {
                this.rmFile(target);
                this.copyFile(item, target);
            }
        }
    }


    rmFile(target) {
        this.options.fs.unlinkSync(target);
        this.statistics.overwrited++;
    }

    copyFile(item, target) {
        let bytesRead, pos;
        const fdr = this.options.fs.openSync(item.path, "r");
        const fdw = this.options.fs.openSync(target, "w", item.stat.mode);
        bytesRead = 1;
        pos = 0;
        while (bytesRead > 0) {
            bytesRead = this.options.fs.readSync(fdr, this._buff, 0, this.BUF_LENGTH, pos);
            this.options.fs.writeSync(fdw, this._buff, 0, bytesRead);
            pos += bytesRead;
        }
        if (this.options.preserveTimestamps) {
            this.options.fs.futimesSync(fdw, item.stat.atime, item.stat.mtime);
        }
        this.options.fs.closeSync(fdr);
        this.options.fs.closeSync(fdw);
        this.statistics.copied.files++;
        this.statistics.copied.size += item.stat.size;
    }


    onLink(item) {
        const target = item.path.replace(this.src, this.dst);
        const resolvedPath = this.options.fs.readlinkSync(item.path);
        this.checkLink(resolvedPath, target, item);
    }


    checkLink(resolvedPath, target, item) {
        if (this.options.dereference) {
            resolvedPath = nodePath.resolve(this.basePath, resolvedPath);
        }
        if (resolvedPath === target) {
            this.statistics.copied.link++;
            return;
        }
        if (this.isWritable(target)) {
            this.makeLink(resolvedPath, target, item);
        } else {
            let targetDst;
            try {
                targetDst = this.options.fs.readlinkSync(target);
            } catch (err) {
                if (err.code === "EINVAL") {
                    this.statistics.copied.links++;
                    return;
                }
                throw err;
            }
            if (this.options.dereference) {
                targetDst = nodePath.resolve(this.basePath, targetDst);
            }
            if (targetDst === resolvedPath) {
                this.statistics.copied.links++;
                return;
            }
            this.rmFile(target);
            this.makeLink(resolvedPath, target, item);
        }
    }

    makeLink(resolvedPath, target) {
        this.options.fs.symlinkSync(resolvedPath, target);
        this.statistics.copied.links++;
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
 * @return {Error|Object} Error | Copied items statistics
 */
function copy(src, dst, opt) {
    if (isFunction(opt) || isRegExp(opt)) {
        opt = {filter: opt};
    }
    let options = opt || {};
    options.fs = options.fs || enFs;
    options.limit = options.limit || enFs.limit || 512;
    options.overwrite = options.overwrite === true;
    options.preserveTimestamps = options.preserveTimestamps === true;
    options.stopOnError = options.stopOnError !== false;
    options.dereference = options.dereference === true;
    options.errors = options.errors || null;
    (new CopyFiles(src, dst, options)).start();
}


module.exports = copy;

