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
    copy = enFsCopy.copy,
    cwd = process.cwd();

describe("enFsCopyAsyncDevNull", function() {
    var tmpPath, isWindows;

    before(function() {
        tmpPath = nodePath.join(nodeOs.tmpdir(), "enfscopyAsyncDev");
        isWindows = /^win/.test(process.platform);
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
    describe("+ copy()", function() {
        it("should return an error", function(done) {
            // no /dev/null on windows
            if (isWindows) {
                return done();
            }
            copy("/dev/null", nodePath.join(tmpPath, "file.txt"), function(err) {
                (err === null).should.be.equal(true);
                enFs.lstatSync(nodePath.join(tmpPath, "file.txt")).size.should.be.equal(0);
                done();
            });
        });
    });
});
