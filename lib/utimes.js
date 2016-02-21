/**
 * @project enfscopy
 * @filename index.js
 * @description helper methods for enfscopy module
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2016 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 18-02-2016.
 * @version 0.0.1
 */


"use strict";

var nodePath = require("path"),
    nodeOs = require("os"),
    nodeUtil = require("util");


function utimesMillis(fs, path, atime, mtime, callback) {
    fs.open(path, "r+", function(errOpen, fd) {
        if (errOpen) {
            return callback(errOpen);
        }
        fs.futimes(fd, atime, mtime, function(errFuTimes) {
            if (errFuTimes) {
                return callback(errFuTimes);
            }
            fs.close(fd, callback);
        });
    });
}


function hasMillisRes(fs, callback) {
    var tmpFile, date;
    tmpFile = nodePath.join("millis-test" + (new Date()).now().toString() + Math.random().toString().slice(2));
    tmpFile = nodePath.join(nodeOs.tmpDir(), tmpFile);

    //550 millis past UNIX epoch
    date = new Date(1435410243862);
    fs.writeFile(tmpFile, "enfscopy/utimes", function(errWrite) {
        if (errWrite) {
            return callback(errWrite);
        }
        fs.open(tmpFile, "r+", function(errOpen, fd) {
            if (errOpen) {
                return callback(errOpen);
            }
            fs.futimes(fd, date, date, function(errFuTimes) {
                if (errFuTimes) {
                    return callback(errFuTimes);
                }
                fs.close(fd, function(errClose) {
                    if (errClose) {
                        return callback(errClose);
                    }
                    fs.stat(tmpFile, function(errStat, stats) {
                        if (errStat) {
                            return callback(errStat);
                        }
                        callback(null, stats.mtime > 1435410243000);
                    });
                });
            });
        });
    });
}


//HFS, ext{2,3}, FAT do not, Node.js v0.10 does not
function hasMillisResSync(fs) {
    var date, tmpFile, fd;
    tmpFile = nodePath.join("millis-test-sync" + (new Date()).now().toString() + Math.random().toString().slice(2));
    tmpFile = nodePath.join(nodeOs.tmpDir(), tmpFile);

    //550 millis past UNIX epoch
    date = new Date(1435410243862);
    fs.writeFileSync(tmpFile, "enfscopy/utimes");
    fd = fs.openSync(tmpFile, "r+");
    fs.futimesSync(fd, date, date);
    fs.closeSync(fd);
    return fs.statSync(tmpFile).mtime > 1435410243000;
}


function timeRemoveMillis(timestamp) {
    if (nodeUtil.isNumber(timestamp)) {
        return Math.floor(timestamp / 1000) * 1000;
    } else if (nodeUtil.isDate(timestamp)) {
        return new Date(Math.floor(timestamp.getTime() / 1000) * 1000);
    } else {
        throw new Error("enfscopy: timeRemoveMillis() unknown parameter type");
    }
}


module.exports = {
    utimesMillis: utimesMillis,
    hasMillisRes: hasMillisRes,
    hasMillisResSync: hasMillisResSync,
    timeRemoveMillis: timeRemoveMillis
};


