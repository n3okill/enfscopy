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

describe("enFsCopyAsyncToSelf", function() {
    var tmpPath, isWindows;
    tmpPath = nodePath.join(nodeOs.tmpdir(), "enfscopyasynctoself");
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


    describe("> copy to self", function() {
        var src, out, src_out, src_symlink, src_file, doubleSrcOut, doubleSrcMiddleOut;
        src = nodePath.join(tmpPath, "src");
        out = nodePath.join(tmpPath, "src", "out");
        src_out = nodePath.join(tmpPath, "src_out");
        src_symlink = nodePath.join(tmpPath, "src_symlink");
        src_file = nodePath.join(tmpPath, "src", "file.txt");
        doubleSrcOut = nodePath.join(src, src + "_out");
        doubleSrcMiddleOut = nodePath.join(src + "_out", src);

        beforeEach(function() {
            enfsmkdirp.mkdirpSync(src);
            enfsmkdirp.mkdirpSync(out);
            enfsmkdirp.mkdirpSync(src_out);
            enfsmkdirp.mkdirpSync(doubleSrcOut);
            enfsmkdirp.mkdirpSync(doubleSrcMiddleOut);
            enFs.writeFileSync(src_file, "data", "utf8");
        });

        it("returns an error when user copies parent to itself", function(done) {
            copy(src, out, function(err) {
                err.should.be.instanceOf(Error);
                err.code.should.be.equal("ESELF");
                done();
            });
        });
        it("copies 'src' to 'src' itself don't throw error", function(done) {
            copy(src, src, function(err) {
                (err === null).should.be.equal(true);
                done();
            });
        });
        it("copies 'src' to 'src/out' and directory 'src/out' does not exist", function(done) {
            copy(src, out, function(err) {
                err.should.be.instanceOf(Error);
                err.code.should.be.equal("ESELF");
                done();
            });
        });
        it("copies 'src to 'src_out'", function(done) {
            copy(src, src_out, function(err) {
                (err === null).should.be.equal(true);
                done();
            });
        });
        it("copies 'src' to 'src_symlink'", function(done) {
            enFs.symlinkSync(src, src_symlink);
            copy(src, src_symlink, function(err) {
                (err === null).should.be.equal(true);
                done();
            });
        });
        it("copies file 'src/file.txt' to file 'src/file.txt' don't throw error", function(done) {
            copy(src_file, src_file, function(err) {
                (err === null).should.be.equal(true);
                done();
            });
        });
        it("copies directory 'src' to 'src/src_out'", function(done) {
            copy(src, doubleSrcOut, function(err) {
                err.should.be.instanceOf(Error);
                if (isWindows) {
                    err.message.should.be.equal("Error trying to copy. 'destination' is a sub-directory of 'source'");
                    return done();
                }
                err.code.should.be.equal("ESELF");
                done();
            });
        });
        it("copies directory 'src' to 'src_out/src'", function(done) {
            copy(src, doubleSrcMiddleOut, function(err) {
                if (err && isWindows) {
                    err.message.should.be.equal("Invalid character found in path.");
                    return done();
                }
                (err === null).should.be.equal(true);
                done();
            });
        });
    });
});
