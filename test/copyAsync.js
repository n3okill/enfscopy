/* global afterEach, beforeEach, describe, it, after, before, process, __dirname */
/**
 * Created by n3okill on 22-12-2015.
 */


"use strict";


var nodePath = require("path"),
    nodeOs = require("os"),
    enFs = require("enfspatch"),
    nodeCrypto = require("crypto"),
    rimraf = require("rimraf"),
    enfsmkdirp = require("enfsmkdirp"),
    enFsCopy = require("../"),
    copy = enFsCopy.copy,
    cwd = process.cwd();

describe("enFsCopyAsync", function() {
    var SIZE, tmpPath, isWindows, windowsTestLink, FILES;
    tmpPath = nodePath.join(nodeOs.tmpdir(), "enfscopyasync");
    SIZE = 16 * 64 * 1024 + 7;
    isWindows = /^win/.test(process.platform);
    windowsTestLink = true;
    FILES = 2;

    before(function() {
        var i;
        enfsmkdirp.mkdirpSync(tmpPath);
        process.chdir(tmpPath);
        if (isWindows) {
            enFs.writeFileSync(nodePath.join(tmpPath, "windowsTest", ""));
            try {
                enFs.symlinkSync(nodePath.join(tmpPath, "windowsTestLink"), nodePath.join(tmpPath, "windowsTest"), "file");
            } catch (err) {
                if (err.code === "EPERM") {
                    windowsTestLink = false;
                }
            }
        }
        enFs.writeFileSync(nodePath.join(tmpPath, "TEST_enfscopy_src"), nodeCrypto.randomBytes(SIZE));
        enFs.writeFileSync(nodePath.join(tmpPath, "file.bin"), "");
        enFs.writeFileSync(nodePath.join(tmpPath, "file.css"), "");
        enFs.writeFileSync(nodePath.join(tmpPath, "file1.bin"), "");
        enFs.writeFileSync(nodePath.join(tmpPath, "file.txt"), "did it copy?\n", "utf8");
        enFs.mkdirSync(nodePath.join(tmpPath, "srca"));
        for (i = 0; i < FILES; i++) {
            enFs.writeFileSync(nodePath.join(nodePath.join(tmpPath, "srca"), i.toString()), nodeCrypto.randomBytes(SIZE));
        }
        enFs.mkdirSync(nodePath.join(nodePath.join(tmpPath, "srca"), "subdir"));
        for (i = 0; i < FILES; i++) {
            enFs.writeFileSync(nodePath.join(nodePath.join(nodePath.join(tmpPath, "srca"), "subdir"), i.toString()), nodeCrypto.randomBytes(SIZE));
        }
        enFs.mkdirSync(nodePath.join(tmpPath, "data"));
        enFs.writeFileSync(nodePath.join(nodePath.join(tmpPath, "data"), "f1.txt"), "file1");
        enFs.writeFileSync(nodePath.join(nodePath.join(tmpPath, "data"), "f2.txt"), "file2");
        enFs.writeFileSync(nodePath.join(tmpPath, "identicalFile"), "some data");
        enFs.writeFileSync(nodePath.join(tmpPath, "identicalFile1"), "some data");
        if (windowsTestLink) {
            enFs.symlinkSync(nodePath.join(tmpPath, "identicalFile"), nodePath.join(tmpPath, "testLink"), "file");
            enFs.symlinkSync(nodePath.join(tmpPath, "identicalFile1"), nodePath.join(tmpPath, "testLink1"), "file");
        }
    });
    after(function() {
        process.chdir(cwd);
        rimraf.sync(tmpPath);
    });
    describe("> when the source is a file", function() {
        it("should copy the file", function(done) {
            var src, dst, srcMd5;
            src = nodePath.join(tmpPath, "TEST_enfscopy_src");
            dst = nodePath.join(tmpPath, "TEST_enfscopy_dst");
            srcMd5 = nodeCrypto.createHash("md5").update(enFs.readFileSync(src)).digest("hex");
            copy(src, dst, function(err) {
                var dstMd5;
                (err === null).should.be.equal(true);
                dstMd5 = nodeCrypto.createHash("md5").update(enFs.readFileSync(dst)).digest("hex");
                srcMd5.should.be.equal(dstMd5);
                done();
            });
        });
        it("should return an error if the source file does not exist", function(done) {
            var src, dst;
            src = "this-file-does-not-exist.file";
            dst = nodePath.join(tmpPath, "TEST_enfscopy_dst");
            copy(src, dst, function(err) {
                err.should.be.instanceOf(Error);
                done();
            });
        });
        it("should only copy files allowed by filter regex", function(done) {
            var src, dst, filter;
            src = nodePath.join(tmpPath, "file.bin");
            dst = nodePath.join(tmpPath, "dstfile.html");
            filter = /.html$|.css$/i;
            copy(src, dst, filter, function(err) {
                (err === null).should.be.equal(true);
                enFs.stat(dst, function(errStat) {
                    errStat.should.be.instanceof(Error);
                    done();
                });
            });
        });
        it("should only copy files allowed by filter function", function(done) {
            var src, dst, filter;
            src = nodePath.join(tmpPath, "file.css");
            dst = nodePath.join(tmpPath, "dstFile.css");
            filter = function(path) {
                return path.split('.').pop() !== "css"
            };
            copy(src, dst, filter, function(err) {
                (err === null).should.be.equal(true);
                enFs.stat(dst, function(errStat) {
                    errStat.should.be.instanceOf(Error);
                    done();
                });
            });
        });
        it("accepts options object in place of filter", function(done) {
            var src, dst;
            src = nodePath.join(tmpPath, "file1.bin");
            dst = nodePath.join(tmpPath, "dstFile.bin");
            copy(src, dst, {filter: /.html$|.css$/i}, function(err) {
                (err === null).should.be.equal(true);
                enFs.stat(dst, function(errStat) {
                    errStat.should.be.instanceOf(Error);
                    done();
                });
            });
        });
        describe("> when the destination dir does not exist", function() {
            it("should create the destination directory and copy the file", function(done) {
                var src, dst;
                src = nodePath.join(tmpPath, "file.txt");
                dst = nodePath.join(tmpPath, "this", "path", "does", "not", "exist", "copied.txt");
                copy(src, dst, function(err) {
                    (err === null).should.be.equal(true);
                    enFs.readFileSync(dst, "utf8").should.be.equal("did it copy?\n");
                    done();
                });
            });
        });
    });
    describe("> when the source is a directory", function() {
        describe("> when the source directory does not exist", function() {
            it("should return an error", function(done) {
                var src, dst;
                src = nodePath.join(tmpPath, "this_dir_dos_not_exist");
                dst = nodePath.join(tmpPath, "this_dir_really_does_not_matter");
                copy(src, dst, function(err) {
                    err.should.be.instanceOf(Error);
                    done();
                });
            });
        });
        it("should copy the directory", function(done) {
            var FILES, src, dst, subdir;
            FILES = 2;
            src = nodePath.join(tmpPath, "srca");
            dst = nodePath.join(tmpPath, "dsta");
            subdir = nodePath.join(src, "subdir");
            copy(src, dst, function() {
                var statDst, statFile, dstSubDir, statDstSubDir, i;
                statDst = enFs.statSync(dst);
                statDst.isDirectory().should.be.equal(true);
                for (i = 0; i < FILES; i++) {
                    statFile = enFs.statSync(nodePath.join(dst, i.toString()));
                    statFile.isFile().should.be.equal(true);
                }
                dstSubDir = nodePath.join(dst, "subdir");
                statDstSubDir = enFs.statSync(dstSubDir);
                statDstSubDir.isDirectory().should.be.equal(true);
                for (i = 0; i < FILES; i++) {
                    statFile = enFs.statSync(nodePath.join(dstSubDir, i.toString()));
                    statFile.isFile().should.be.equal(true);
                }
                done();
            });
        });
        describe("> when the destination directory does not exist", function() {
            it("should create the destination directory and copy the file", function(done) {
                var src, f1, f2, dst;
                src = nodePath.join(tmpPath, "data");
                dst = nodePath.join(tmpPath, "this", "path", "does", "not", "exist");
                copy(src, dst, function() {
                    enFs.readFileSync(nodePath.join(dst, "f1.txt"), "utf8").should.be.equal("file1");
                    enFs.readFileSync(nodePath.join(dst, "f2.txt"), "utf8").should.be.equal("file2");
                    done();
                });
            });
        });
        describe("> when src directory does not exist", function() {
            it("should return an error", function(done) {
                copy("/path/does/not/exist", "/to/any/place", function(err) {
                    err.should.be.instanceOf(Error);
                    done();
                });
            });
        });
    });
    describe("> when the src and dst are identical", function() {
        var file, fileData, file1;
        file = nodePath.join(tmpPath, "identicalFile");
        file1 = nodePath.join(tmpPath, "identicalFile1");
        fileData = "some data";
        describe("> when the src and dst are the same file", function() {
            it("should not copy and not throw an error", function(done) {
                copy(file, file, function(err) {
                    (err === null).should.be.equal(true);
                    enFs.readFileSync(file, "utf8").should.be.equal(fileData);
                    done();
                });
            });
        });
        describe("> when the src is symlink and points to dst", function() {
            it("should not copy and keep the symlink", function(done) {
                var src, dst;
                src = nodePath.join(tmpPath, "testLink");
                dst = file;
                if (isWindows && !windowsTestLink) {
                    return done();
                }
                copy(src, dst, function(err) {
                    (err === null).should.be.equal(true);
                    enFs.readFileSync(dst, "utf8").should.be.equal(fileData);
                    enFs.readlinkSync(src).should.be.equal(dst);
                    done();
                });
            });
        });
        describe("> when dst is symlink and points to src", function() {
            it("should not copy and keep the symlink", function(done) {
                var src, dst;
                src = file1;
                dst = nodePath.join(tmpPath, "testLink1");
                if (isWindows && !windowsTestLink) {
                    return done();
                }

                copy(src, dst, function(err) {
                    (err === null).should.be.equal(true);
                    enFs.readFileSync(dst, "utf8").should.be.equal(fileData);
                    enFs.readlinkSync(dst).should.be.equal(src);
                    done();
                });
            });
        });
    });
    describe("> when using dereference", function() {
        var src, file, fileLink, dir, dirFile, dst;
        before(function() {
            if (windowsTestLink) {
                enfsmkdirp.mkdirpSync(nodePath.join(tmpPath, "src", "default"));
                enFs.writeFileSync(nodePath.join(nodePath.join(tmpPath, "src", "default"), "file"), "contents");
                enFs.symlinkSync(nodePath.join(nodePath.join(tmpPath, "src", "default"), "file"), nodePath.join(nodePath.join(tmpPath, "src", "default"), "fileLink"), "file");
                enFs.mkdirSync(nodePath.join(nodePath.join(tmpPath, "src", "default"), "dir"));
                enFs.writeFileSync(nodePath.join(nodePath.join(tmpPath, "src", "default"), "dirFile"), "contents");
                enFs.symlinkSync(nodePath.join(nodePath.join(tmpPath, "src", "default"), "dir"), nodePath.join(nodePath.join(tmpPath, "src", "default"), "dirFileLink"), "dir");
                enfsmkdirp.mkdirpSync(nodePath.join(tmpPath, "src", "deref"));
                enFs.writeFileSync(nodePath.join(nodePath.join(tmpPath, "src", "deref"), "file"), "contents");
                enFs.symlinkSync(nodePath.join(nodePath.join(tmpPath, "src", "deref"), "file"), nodePath.join(nodePath.join(tmpPath, "src", "deref"), "fileLink"), "file");
                enFs.mkdirSync(nodePath.join(nodePath.join(tmpPath, "src", "deref"), "dir"));
                enFs.writeFileSync(nodePath.join(nodePath.join(nodePath.join(tmpPath, "src", "deref"), "dir"), "dirFile"), "contents");
                enFs.symlinkSync(nodePath.join(nodePath.join(tmpPath, "src", "deref"), "dir"), nodePath.join(nodePath.join(tmpPath, "src", "deref"), "dirFileLink"), "dir");
            }
        });
        it("copies symlinks by default", function(done) {
            src = nodePath.join(tmpPath, "src", "default");
            file = nodePath.join(src, "file");
            dir = nodePath.join(src, "dir");
            dst = nodePath.join(tmpPath, "dst", "default");
            if (isWindows && !windowsTestLink) {
                return done();
            }
            copy(src, dst, function(err) {
                (err === null).should.be.equal(true);
                enFs.readlinkSync(nodePath.join(dst, "fileLink")).should.be.equal(file);
                enFs.readlinkSync(nodePath.join(dst, "dirFileLink")).should.be.equal(dir);
                done();
            });
        });

        it("copies file contents when dereference=true", function(done) {
            src = nodePath.join(tmpPath, "src", "deref");
            dst = nodePath.join(tmpPath, "dst", "deref");
            if (isWindows && !windowsTestLink) {
                return done();
            }
            copy(src, dst, {dereference: true}, function(err) {
                var fileSymLink, dirSymLink;
                (err === null).should.be.equal(true);
                fileSymLink = nodePath.join(dst, "fileLink");
                dirSymLink = nodePath.join(dst, "dirFileLink");
                enFs.statSync(fileSymLink).isFile().should.be.equal(true);
                enFs.readFileSync(fileSymLink, "utf8").should.be.equal("contents");
                enFs.statSync(dirSymLink).isDirectory().should.be.equal(true);
                enFs.readdirSync(dirSymLink).should.be.eql(["dirFile"]);
                done();
            });
        });
    });
});
