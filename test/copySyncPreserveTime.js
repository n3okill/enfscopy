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
    copy = enFsCopy.copySync,
    cwd = process.cwd();

describe("enFsCopySyncPreserveTime", function() {
    var tmpPath, helpersPath, isWindows;
    tmpPath = nodePath.join(nodeOs.tmpdir(), "enfscopysynctime");
    helpersPath = nodePath.join(__dirname, "helper");
    isWindows = /^win/.test(process.platform);

    before(function() {
        enfsmkdirp.mkdirpSync(tmpPath);
        process.chdir(tmpPath);
    });
    afterEach(function() {
        rimraf.sync(tmpPath + nodePath.sep + "*");
    });
    after(function() {
        process.chdir(cwd);
        rimraf.sync(tmpPath);
    });

    describe("> modification option", function() {
        var FILES = ["file1", nodePath.join("subfolder1", "file2"), nodePath.join("subfolder1", "file3"), nodePath.join("subfolder1", "subfolder2", "file4")];
        describe("> when modified option is turned off", function() {
            it("should have different timestamp on copy", function() {
                var src, dst;
                src = helpersPath;
                dst = tmpPath;
                copy(src, dst, {preserveTimestamps: false});
                for (var i = 0; i < FILES.length; i++) {
                    testFile({preserveTimestamps: false}, FILES[i]);
                }
            });
        });

        describe("> when modified option is turned on", function() {
            it("should have the same timestamps on copy", function() {
                var src, dst;
                src = helpersPath;
                dst = tmpPath;
                copy(src, dst, {preserveTimestamps: true});
                for (var i = 0; i < FILES.length; i++) {
                    testFile({preserveTimestamps: true}, FILES[i]);
                }
            });
        });

        function testFile(options, file) {
            var src, dst;
            src = nodePath.join(tmpPath, file);
            dst = nodePath.join(helpersPath, file);
            var statSrc = enFs.statSync(src);
            var statDst = enFs.statSync(dst);
            if (options.preserveTimestamps) {
                if (isWindows) {
                    statSrc.mtime.getTime().should.be.equal(utimes.timeRemoveMillis(statDst.mtime.getTime()));
                    statSrc.atime.getTime().should.be.equal(utimes.timeRemoveMillis(statDst.atime.getTime()));
                } else {
                    statSrc.mtime.getTime().should.be.equal(statDst.mtime.getTime());
                    statSrc.atime.getTime().should.be.equal(statDst.atime.getTime());
                }
            } else {
                // the access time might actually be the same, so check only modification time
                statSrc.mtime.getTime().should.not.be.equal(statDst.mtime.getTime());
            }
        }
    });
});
