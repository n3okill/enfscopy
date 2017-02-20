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
const copy = enFsCopy.copy;
const cwd = process.cwd();

describe("enFsCopyAsyncPermissions", function() {
    const tmpPath = nodePath.join(nodeOs.tmpdir(), "enfscopyasyncperm");
    const isWindows = /^win/.test(process.platform);
    // http://man7.org/linux/man-pages/man2/stat.2.html
    const S_IFREG = parseInt("0100000", 8);    //regular file
    const S_IFDIR = parseInt("0040000", 8);    //regular directory


    function createFile(name, mode, owner) {
        enFs.writeFileSync(name, "");
        enFs.chmodSync(name, mode);
        enFs.chownSync(name, process.getuid(), owner);
        const stat = enFs.lstatSync(name);
        (stat.mode - S_IFREG).should.be.equal(mode);
        return stat;
    }

    function createDir(path, mode, owner) {
        enFs.mkdirSync(path);
        enFs.chmodSync(path, mode);
        enFs.chownSync(path, process.getuid(), owner);
        const stat = enFs.lstatSync(path);
        (stat.mode - S_IFDIR).should.be.equal(mode);
        return stat;
    }

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

    it("should maintain file permissions and ownership", function(done) {
        let ownerFile, ownerDir;
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

        const src = nodePath.join(tmpPath, "srcPerm");
        const dst = nodePath.join(tmpPath, "dstPerm");
        enFs.mkdirSync(src);
        const  statF1 = createFile(nodePath.join(src, "f1.txt"), parseInt("0666", 8), ownerFile);
        const d1 = nodePath.join(src, "somedir");
        const statD1 = createDir(d1, parseInt("0777", 8), ownerDir);
        const statF2 = createFile(nodePath.join(d1, "f2.bin"), parseInt("0777", 8), ownerFile);
        const statD2 = createDir(nodePath.join(src, "anotherdir"), parseInt("0444", 8), ownerDir);
        copy(src, dst, function(err) {
            (err === null).should.be.equal(true);
            const newF1 = nodePath.join(dst, "f1.txt");
            const newD1 = nodePath.join(dst, "somedir");
            const newF2 = nodePath.join(newD1, "f2.bin");
            const newD2 = nodePath.join(dst, "anotherdir");
            const statNewF1 = enFs.lstatSync(newF1);
            statNewF1.mode.should.be.equal(statF1.mode);
            statNewF1.gid.should.be.equal(statF1.gid);
            statNewF1.uid.should.be.equal(statF1.uid);
            const statNewD1 = enFs.lstatSync(newD1);
            statNewD1.mode.should.be.equal(statD1.mode);
            statNewD1.gid.should.be.equal(statD1.gid);
            statNewD1.uid.should.be.equal(statD1.uid);
            const statNewF2 = enFs.lstatSync(newF2);
            statNewF2.mode.should.be.equal(statF2.mode);
            statNewF2.gid.should.be.equal(statF2.gid);
            statNewF2.uid.should.be.equal(statF2.uid);
            const statNewD2 = enFs.lstatSync(newD2);
            statNewD2.mode.should.be.equal(statD2.mode);
            statNewD2.gid.should.be.equal(statD2.gid);
            statNewD2.uid.should.be.equal(statD2.uid);
            done();
        });
    });
});
