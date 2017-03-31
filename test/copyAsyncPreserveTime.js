/* global afterEach, beforeEach, describe, it, after, before, process, __dirname */
/**
 * Created by n3okill on 22-12-2015.
 */


"use strict";


const nodePath = require("path");
const nodeOs = require("os");
const enFs = require("enfspatch");
const rimraf = require("rimraf");
const enfsmkdirp = require("enfsmkdirp");
const enFsCopy = require("../");
const utimes = require("../lib/utimes");
const copy = enFsCopy.copy;
const cwd = process.cwd();
const semver = require("semver");

describe("enFsCopyAsyncPreserveTime", function() {
    const tmpPath = nodePath.join(nodeOs.tmpdir(), "enfscopyasynctime");
    const helpersPath = nodePath.join(__dirname, "helper");
    const isWindows = /^win/.test(process.platform);

    before(function() {
        enfsmkdirp.mkdirpSync(tmpPath);
        process.chdir(tmpPath);
    });
    after(function() {
        process.chdir(cwd);
        rimraf.sync(tmpPath);
    });

    describe("> modification option", function() {
        const  FILE = "file1";
        describe("> when modified option is turned off", function() {
            it("should have different timestamp on copy", function(done) {
                const src = helpersPath;
                const dst = nodePath.join(tmpPath, "off");
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
                const src = helpersPath;
                const dst = nodePath.join(tmpPath, "on");
                copy(src, dst, {preserveTimestamps: true}, function(err) {
                    (err === null).should.be.equal(true);
                    enFs.stat(nodePath.join(src, FILE), function(err, statSrc) {
                        (err === null).should.be.equal(true);
                        enFs.stat(nodePath.join(dst, FILE), function(err, statDst) {
                            (err === null).should.be.equal(true);
                            if (isWindows && semver.satisfies(process.version,"<7")) {
                                statDst.mtime.getTime().should.be.equal(utimes.timeRemoveMillis(statSrc.mtime.getTime()));
                                statDst.atime.getTime().should.be.equal(utimes.timeRemoveMillis(statSrc.atime.getTime()));
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
