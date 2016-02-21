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
    copy = enFsCopy.copySync,
    cwd = process.cwd();

describe("enFsCopySyncDevNull", function() {
    var tmpPath, isWindows;
    tmpPath = nodePath.join(nodeOs.tmpdir(), "enfscopysyncdev");
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
    describe("+ copy()", function() {
        it("should return an error", function() {
            // no /dev/null on windows
            if (isWindows) {
                return;
            }
            copy("/dev/null", nodePath.join(tmpPath, "file.txt"));
            enFs.lstatSync(nodePath.join(tmpPath, "file.txt")).size.should.be.equal(0);
        });
    });
});
