const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');
const {setTimeout} = require('timers/promises');
const syncDirectory = require('..');

const assertFileContent=(path, content, msg)=>
    assert.strictEqual(fs.readFileSync(path, 'utf-8'), content, msg||'file must have content');

const assertFileLink=(a, b, msg)=>
    assert.strictEqual(fs.lstatSync(a).ino, fs.lstatSync(b).ino, msg||'file must be hard link');

const assertNotFileLink=(a, b, msg)=>
    assert.notStrictEqual(fs.lstatSync(a).ino, fs.lstatSync(b).ino, msg||'file must not be hard link');

const tryLinkSync=(a,b)=>{
    try{
        fs.ensureLinkSync(a,b);
        return true;
    }
    catch(e){
        return false;
    }
}

const testDir = path.resolve(__dirname, 'tmp');
const srcDir = path.join(testDir, 'srcDir');
const targetDir = path.join(testDir, 'targetDir');
const srcFile = path.join(srcDir, 'test.txt');
const targetFile = path.join(targetDir, 'test.txt');

describe('sync-directory', function () {
    beforeEach(function () {
        fs.ensureDirSync(testDir);
        fs.ensureDirSync(srcDir);
        fs.ensureDirSync(targetDir);
        fs.writeFileSync(srcFile, 'test data', 'utf-8');
    });

    afterEach(function () {
        fs.rmSync(testDir, { recursive: true, force: true });
    });

    describe('sync-copy', function () {
        it('should copy files', function () {
            const watcher = syncDirectory(srcDir, targetDir, {
                type: 'copy'
            });
            assert.strictEqual(watcher, undefined);
            assertFileContent(targetFile, 'test data');
            assertNotFileLink(targetFile, srcFile);
        });
    });

    describe('watch-copy', function () {
        it('should copy files', async function () {
            let watcher;
            try {
                watcher = syncDirectory(srcDir, targetDir, {
                    type: 'copy',
                    watch: true,
                });
                assertFileContent(targetFile, 'test data');
                assertNotFileLink(targetFile, srcFile);
                await setTimeout(100);
                fs.writeFileSync(srcFile, 'new data');
                await setTimeout(100);
                assertFileContent(targetFile, 'new data');
                assertNotFileLink(targetFile, srcFile);
            } finally {
                await watcher.close();
            };
        });
    });

    describe('sync-hardlink', function () {
        it('should hardlink files', function () {
            // no hardlinks on some hosts
            if(!tryLinkSync(srcFile, srcFile+'.link')) this.skip()

            const watcher = syncDirectory(srcDir, targetDir, {
                type: 'hardlink',
            });
            assert.strictEqual(watcher, undefined);
            assertFileContent(targetFile, 'test data');
            assertFileLink(targetFile, srcFile);
        });
    });

    describe('watch-hardlink', function () {
        it('should hardlink files', async function () {
            // no hardlinks on some hosts
            if(!tryLinkSync(srcFile, srcFile+'.link')) this.skip()

            let watcher;
            try {
                watcher = syncDirectory(srcDir, targetDir, {
                    type: 'hardlink',
                    watch: true,
                });
                assertFileContent(targetFile, 'test data');
                assertFileLink(targetFile, srcFile);
                await setTimeout(100);
                fs.writeFileSync(srcFile, 'new data');
                await setTimeout(100);
                assertFileContent(targetFile, 'new data');
                assertFileLink(targetFile, srcFile);
            } finally {
                await watcher.close();
            };
        });
    });
});
