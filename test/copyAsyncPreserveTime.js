/* global afterEach, beforeEach, describe, it, after, before, process, __dirname */
/**
 * Created by n3okill on 22-12-2015.
 */


"use strict";


var nodePath = require("path"),
    nodeOs = require("os"),
    enFs = require("enfspatch"),
    rimraf = require("rimraf"),
    enfsmkdirp = require("enfsmkdirp"),
    enFsCopy = require("../"),
    utimes = require("../lib/utimes"),
    copy = enFsCopy.copy,
    cwd = process.cwd();

describe("enFsCopyAsyncPreserveTime", function() {
    var tmpPath, helpersPath, isWindows, error = false;
    tmpPath = nodePath.join(nodeOs.tmpdir(), "enfscopyasynctime");
    helpersPath = nodePath.join(__dirname, "helper");
    isWindows = /^win/.test(process.platform);

    before(function() {
        enfsmkdirp.mkdirpSync(tmpPath);
        process.chdir(tmpPath);
    });
    after(function() {
        process.chdir(cwd);
        rimraf.sync(tmpPath);
    });

    describe("> modification option", function() {
        var FILE = "file1";
        describe("> when modified option is turned off", function() {
            it("should have different timestamp on copy", function(done) {
                var src, dst;
                src = helpersPath;
                dst = nodePath.join(tmpPath, "off");
                copy(src, dst, {preserveTimestamps: false}, function(err) {
                    (err === null).should.be.equal(true);
                    enFs.stat(nodePath.join(src, FILE), function(err, statSrc) {
                        (err === null).should.be.equal(true);
                        enFs.stat(nodePath.join(dst, FILE), function(err, statDst) {
                            (err === null).should.be.equal(true);
                            // the access time might actually be the same, so check only modification time
                            statSrc.mtime.getTime().should.not.be.equal(statDst.mtime.getTime());
                            done();
                        });
                    });
                });
            });
        });

        describe("> when modified option is turned on", function() {
            it("should have the same timestamps on copy", function(done) {
                var src, dst;
                src = helpersPath;
                dst = nodePath.join(tmpPath, "on");
                copy(src, dst, {preserveTimestamps: true}, function(err) {
                    (err === null).should.be.equal(true);
                    enFs.stat(nodePath.join(src, FILE), function(err, statSrc) {
                        (err === null).should.be.equal(true);
                        enFs.stat(nodePath.join(dst, FILE), function(err, statDst) {
                            (err === null).should.be.equal(true);
                            if (isWindows) {
                                statSrc.mtime.getTime().should.be.equal(utimes.timeRemoveMillis(statDst.mtime.getTime()));
                                statSrc.atime.getTime().should.be.equal(utimes.timeRemoveMillis(statDst.atime.getTime()));
                            } else {
                                statSrc.mtime.getTime().should.be.equal(statDst.mtime.getTime());
                                statSrc.atime.getTime().should.be.equal(statDst.atime.getTime());
                            }
                            done();
                        });
                    });
                });
            });
        });
    });
});
