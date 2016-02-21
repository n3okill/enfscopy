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

describe("enFsCopySyncPermissions", function() {
    var tmpPath, isWindows, S_IFREG, S_IFDIR;
    tmpPath = nodePath.join(nodeOs.tmpdir(), "enfscopysyncperm");
    isWindows = /^win/.test(process.platform);
    // http://man7.org/linux/man-pages/man2/stat.2.html
    S_IFREG = parseInt("0100000", 8);    //regular file
    S_IFDIR = parseInt("0040000", 8);    //regular directory

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

    it("should maintain file permissions and ownership", function() {
        var src, dst, ownerFile, ownerDir, f1, f2, d1;
        if (isWindows) {
            return done();
        }

        // these are Mac specific I think (at least staff), should find Linux equivalent
        try {
            ownerFile = process.getgid(); // userid.gid('wheel')
        } catch (err) {
            ownerFile = process.getgid();
        }

        try {
            ownerDir = process.getgid(); // userid.gid('staff')
        } catch (err) {
            ownerDir = process.getgid();
        }

        src = nodePath.join(tmpPath, "srcPerm");
        dst = nodePath.join(tmpPath, "dstPerm");
        enFs.mkdirSync(src);
        var statF1 = createFile(nodePath.join(src, "f1.txt"), parseInt("0666", 8), ownerFile);
        d1 = nodePath.join(src, "somedir");
        var statD1 = createDir(d1, parseInt("0777", 8), ownerDir);
        var statF2 = createFile(nodePath.join(d1, "f2.bin"), parseInt("0777", 8), ownerFile);
        var statD2 = createDir(nodePath.join(src, "anotherdir"), parseInt("0444", 8), ownerDir);
        copy(src, dst);
        var newF1, newF2, newD1, newD2;

        newF1 = nodePath.join(dst, "f1.txt");
        newD1 = nodePath.join(dst, "somedir");
        newF2 = nodePath.join(newD1, "f2.bin");
        newD2 = nodePath.join(dst, "anotherdir");
        var statNewF1 = enFs.lstatSync(newF1);
        statNewF1.mode.should.be.equal(statF1.mode);
        statNewF1.gid.should.be.equal(statF1.gid);
        statNewF1.uid.should.be.equal(statF1.uid);
        var statNewD1 = enFs.lstatSync(newD1);
        statNewD1.mode.should.be.equal(statD1.mode);
        statNewD1.gid.should.be.equal(statD1.gid);
        statNewD1.uid.should.be.equal(statD1.uid);
        var statNewF2 = enFs.lstatSync(newF2);
        statNewF2.mode.should.be.equal(statF2.mode);
        statNewF2.gid.should.be.equal(statF2.gid);
        statNewF2.uid.should.be.equal(statF2.uid);
        var statNewD2 = enFs.lstatSync(newD2);
        statNewD2.mode.should.be.equal(statD2.mode);
        statNewD2.gid.should.be.equal(statD2.gid);
        statNewD2.uid.should.be.equal(statD2.uid);
    });


    function createFile(name, mode, owner) {
        enFs.writeFileSync(name, "");
        enFs.chmodSync(name, mode);
        enFs.chownSync(name, process.getuid(), owner);
        var stat = enFs.lstatSync(name);
        (stat.mode - S_IFREG).should.be.equal(mode);
        return stat;
    }

    function createDir(path, mode, owner) {
        enFs.mkdirSync(path);
        enFs.chmodSync(path, mode);
        enFs.chownSync(path, process.getuid(), owner);
        var stat = enFs.lstatSync(path);
        (stat.mode - S_IFDIR).should.be.equal(mode);
        return stat;
    }
});
