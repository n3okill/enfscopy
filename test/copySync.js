/* global afterEach, beforeEach, describe, it, after, before, process, __dirname */
/**
 * Created by n3okill on 22-12-2015.
 */


"use strict";


const nodePath = require("path");
const nodeOs = require("os");
const enFs = require("enfspatch");
const nodeCrypto = require("crypto");
const rimraf = require("rimraf");
const enfsmkdirp = require("enfsmkdirp");
const enFsCopy = require("../");
const copy = enFsCopy.copySync;
const cwd = process.cwd();

describe("enFsCopySync", function() {
    let windowsTestLink;
    const tmpPath = nodePath.join(nodeOs.tmpdir(), "enfscopysync");
    const SIZE = 16 * 64 * 1024 + 7;
    const isWindows = /^win/.test(process.platform);
    windowsTestLink = true;

    before(function() {
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
    });
    afterEach(function() {
        rimraf.sync(tmpPath + nodePath.sep + "*");
    });
    after(function() {
        process.chdir(cwd);
        rimraf.sync(tmpPath);
    });
    describe("> when the source is a file", function() {
        it("should copy the file", function() {
            const src = nodePath.join(tmpPath, "TEST_enfscopy_src");
            const dst = nodePath.join(tmpPath, "TEST_enfscopy_dst");
            enFs.writeFileSync(src, nodeCrypto.randomBytes(SIZE));
            const srcMd5 = nodeCrypto.createHash("md5").update(enFs.readFileSync(src)).digest("hex");
            copy(src, dst);
            const dstMd5 = nodeCrypto.createHash("md5").update(enFs.readFileSync(dst)).digest("hex");
            srcMd5.should.be.equal(dstMd5);
        });
        it("should return an error if the source file does not exist", function(done) {
            const src = "this-file-does-not-exist.file";
            const dst = nodePath.join(tmpPath, "TEST_enfscopy_dst");
            try {
                copy(src, dst);
            } catch (err) {
                err.should.be.instanceOf(Error);
                done();
            }
        });
        it("should only copy files allowed by filter regex", function() {
            const src = nodePath.join(tmpPath, "file.bin");
            enFs.writeFileSync(src, "");
            const dst = nodePath.join(tmpPath, "dstfile.html");
            const filter = /.html$|.css$/i;
            copy(src, dst, filter);
            try {
                enFs.statSync(dst);
            } catch (err) {
                err.should.be.instanceOf(Error);
            }
        });
        it("should only copy files allowed by filter function", function() {
            const src = nodePath.join(tmpPath, "file.css");
            enFs.writeFileSync(src, "");
            const dst = nodePath.join(tmpPath, "dstFile.css");
            const filter = function(s) {
                return s.split(".").pop() !== "css";
            };
            copy(src, dst, filter);
            try {
                enFs.statSync(dst);
            } catch (err) {
                err.should.be.instanceOf(Error);
            }
        });
        it("accepts options object in place of filter", function() {
            const src = nodePath.join(tmpPath, "file.bin");
            enFs.writeFileSync(src, "");
            const dst = nodePath.join(tmpPath, "dstFile.bin");
            copy(src, dst, {filter: /.html$|.css$/i});
            try {
                enFs.statSync(dst);
            } catch (err) {
                err.should.be.instanceOf(Error);
            }
        });
        it("should maintain file mode", function() {
            const src = nodePath.join(tmpPath, "TEST_enfscopy_src");
            const dst = nodePath.join(tmpPath, "TEST_enfscopy_dst");
            enFs.writeFileSync(src, nodeCrypto.randomBytes(SIZE));
            enFs.chmodSync(src, parseInt("0750", 8));
            copy(src, dst);
            enFs.statSync(src).mode.should.be.equal(enFs.statSync(dst).mode);
        });

        describe("> when the destination dir does not exist", function() {
            it("should create the destination directory and copy the file", function() {
                const src = nodePath.join(tmpPath, "file.txt");
                const data = "did it copy?\n";
                enFs.writeFileSync(src, data, "utf8");
                const dst = nodePath.join(tmpPath, "this", "path", "does", "not", "exist", "copied.txt");
                copy(src, dst);
                enFs.readFileSync(dst, "utf8").should.be.equal(data);
            });
        });
    });
    describe("> when the source is a directory", function() {
        describe("> when the source directory does not exist", function() {
            it("should return an error", function(done) {
                const src = nodePath.join(tmpPath, "this_dir_dos_not_exist");
                const dst = nodePath.join(tmpPath, "this_dir_really_does_not_matter");
                try {
                    copy(src, dst);
                } catch (err) {
                    err.should.be.instanceOf(Error);
                    done();
                }
            });
        });
        it("should copy the directory", function() {
            const FILES = 2;
            const src = nodePath.join(tmpPath, "src");
            const dst = nodePath.join(tmpPath, "dst");
            enFs.mkdirSync(src);
            for (let i = 0; i < FILES; i++) {
                enFs.writeFileSync(nodePath.join(src, i.toString()), nodeCrypto.randomBytes(SIZE));
            }
            const subdir = nodePath.join(src, "subdir");
            enFs.mkdirSync(subdir);
            for (let i = 0; i < FILES; i++) {
                enFs.writeFileSync(nodePath.join(subdir, i.toString()), nodeCrypto.randomBytes(SIZE));
            }
            copy(src, dst);
            const statDst = enFs.statSync(dst);
            let statFile;
            statDst.isDirectory().should.be.equal(true);
            for (let i = 0; i < FILES; i++) {
                statFile = enFs.statSync(nodePath.join(dst, i.toString()));
                statFile.isFile().should.be.equal(true);
            }
            const dstSubDir = nodePath.join(dst, "subdir");
            const statDstSubDir = enFs.statSync(dstSubDir);
            statDstSubDir.isDirectory().should.be.equal(true);
            for (let i = 0; i < FILES; i++) {
                statFile = enFs.statSync(nodePath.join(dstSubDir, i.toString()));
                statFile.isFile().should.be.equal(true);
            }
        });
        describe("> when the destination directory does not exist", function() {
            it("should create the destination directory and copy the file", function() {
                const src = nodePath.join(tmpPath, "data");
                enFs.mkdirSync(src);
                const f1 = "file1";
                const f2 = "file2";
                enFs.writeFileSync(nodePath.join(src, "f1.txt"), f1);
                enFs.writeFileSync(nodePath.join(src, "f2.txt"), f2);
                const dst = nodePath.join(tmpPath, "this", "path", "does", "not", "exist");
                copy(src, dst);
                const c1 = enFs.readFileSync(nodePath.join(dst, "f1.txt"), "utf8");
                const c2 = enFs.readFileSync(nodePath.join(dst, "f2.txt"), "utf8");
                c1.should.be.equal(f1);
                c2.should.be.equal(f2);
            });
        });
        describe("> when src directory does not exist", function() {
            it("should return an error", function(done) {
                try {
                    copy("/path/does/not/exist", "/to/any/place");
                } catch (err) {
                    err.should.be.instanceOf(Error);
                    done();
                }
            });
        });
        describe("> when overwrite is true and dst is readonly", function() {
            it("should copy the file and not throw an error", function() {
                const src = nodePath.join(tmpPath, "TEST_enfscopy_src");
                const dst = nodePath.join(tmpPath, "TEST_enfscopy_dst");
                enFs.writeFileSync(src, "datasrc");
                enFs.writeFileSync(dst, "data");
                enFs.chmodSync(dst, parseInt("0444", 8));
                copy(src, dst, {overwrite: true});
                const contents = enFs.readFileSync(dst, "utf8");
                contents.should.containEql("datasrc");
            });
        });
    });
    describe("> when the src and dst are identical", function() {
        let file, fileData;
        before(function() {
            file = nodePath.join(tmpPath, "identicalFile");
        });
        beforeEach(function() {
            fileData = "some data";
            enFs.writeFileSync(file, fileData);
        });
        describe("> when the src and dst are the same file", function() {
            it("should not copy and not throw an error", function() {
                copy(file, file);
                enFs.readFileSync(file, "utf8").should.be.equal(fileData);
            });
        });
        describe("> when the src is symlink and points to dst", function() {
            it("should not copy and keep the symlink", function() {
                const src = nodePath.join(tmpPath, "testLink");
                const dst = file;
                if (isWindows && !windowsTestLink) {
                    return;
                }
                enFs.symlinkSync(file, src);
                copy(src, dst);
                enFs.readFileSync(dst, "utf8").should.be.equal(fileData);
                enFs.readlinkSync(src).should.be.equal(dst);
            });
        });
        describe("> when dst is symlink and points to src", function() {
            it("should not copy and keep the symlink", function() {
                const src = file;
                const dst = nodePath.join(tmpPath, "testLink");
                if (isWindows && !windowsTestLink) {
                    return;
                }
                enFs.symlinkSync(file, dst);
                copy(src, dst);
                enFs.readFileSync(dst, "utf8").should.be.equal(fileData);
                enFs.readlinkSync(dst).should.be.equal(src);
            });
        });
    });
    describe("> when using dereference", function() {
        let src, file, dir, dst;
        beforeEach(function() {
            src = nodePath.join(tmpPath, "src");
            file = nodePath.join(src, "file");
            const fileLink = nodePath.join(src, "fileLink");
            dir = nodePath.join(src, "dir");
            const dirFile = nodePath.join(dir, "dirFile");
            const dirLink = nodePath.join(src, "dirFileLink");
            dst = nodePath.join(tmpPath, "dst");
            if (isWindows && !windowsTestLink) {
                return;
            }
            enFs.mkdirSync(src);
            enFs.writeFileSync(file, "contents");
            enFs.symlinkSync(file, fileLink, "file");
            enFs.mkdirSync(dir);
            enFs.writeFileSync(dirFile, "contents");
            enFs.symlinkSync(dir, dirLink, "dir");
        });
        it("copies symlinks by default", function() {
            if (isWindows && !windowsTestLink) {
                return;
            }
            copy(src, dst);
            enFs.readlinkSync(nodePath.join(dst, "fileLink")).should.be.equal(file);
            enFs.readlinkSync(nodePath.join(dst, "dirFileLink")).should.be.equal(dir);
        });

        it("copies file contents when dereference=true", function() {
            if (isWindows && !windowsTestLink) {
                return;
            }
            copy(src, dst, {dereference: true});
            const fileSymLink = nodePath.join(dst, "fileLink");
            const dirSymLink = nodePath.join(dst, "dirFileLink");
            enFs.statSync(fileSymLink).isFile().should.be.equal(true);
            enFs.readFileSync(fileSymLink, "utf8").should.be.equal("contents");
            enFs.statSync(dirSymLink).isDirectory().should.be.equal(true);
            enFs.readdirSync(dirSymLink).should.be.eql(["dirFile"]);
        });
    });
});
