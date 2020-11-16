const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');
const syncDirectory = require('..');

function assertFile(path, content) {
    assert.strictEqual(fs.readFileSync(path, 'utf-8'), content);
}

const testFile = path.join('test-srcDir', 'test.txt');
const targetFile = path.join('test-targetDir', 'test.txt');
const testFile2 = path.join('test-srcDir2', 'test.txt');
const targetFile2 = path.join('test-targetDir2', 'test.txt');

async function delay(timeout) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, timeout);
    });
}

describe('sync-directory', function () {
    beforeEach(function () {
        fs.ensureDirSync('test-srcDir');
        fs.writeFileSync(testFile, 'test data', 'utf-8');
    });

    afterEach(function () {
        fs.rmSync('test-srcDir', { recursive: true, force: true });
        fs.rmSync('test-targetDir', { recursive: true, force: true });
    });

    describe('sync-copy', function () {
        it('should copy files', function () {
            const watcher = syncDirectory('test-srcDir', 'test-targetDir', {
                type: 'copy'
            });
            assert.strictEqual(watcher, undefined);
            assertFile(testFile, 'test data');
            assert.notStrictEqual(fs.lstatSync(targetFile).ino, fs.lstatSync(testFile).ino, 'file is a symbolic link');
        });

        it('should copy multiple folders', function () {
            try {
                fs.ensureDirSync('test-srcDir2');
                fs.writeFileSync(testFile2, 'test data2', 'utf-8');
                fs.rmSync('test-targetDir', { recursive: true, force: true });
                const watcher = syncDirectory(['test-srcDir', 'test-srcDir2'], ['test-targetDir', 'test-targetDir2'], {
                    type: 'copy'
                });
                assert.strictEqual(watcher, undefined);
                assertFile(testFile, 'test data');
                assert.notStrictEqual(fs.lstatSync(targetFile).ino, fs.lstatSync(testFile).ino, 'file is a symbolic link');
                assertFile(testFile2, 'test data2');
                assert.notStrictEqual(fs.lstatSync(targetFile2).ino, fs.lstatSync(testFile2).ino, 'file is a symbolic link');
            } finally {
                fs.rmSync('test-srcDir2', { recursive: true, force: true });
                fs.rmSync('test-targetDir2', { recursive: true, force: true });
            }
        });

        it('should copy merge source folders when target folders are the same', function () {
            try {
                fs.ensureDirSync('test-srcDir2');
                fs.writeFileSync(path.join('test-srcDir2', 'test2.txt'), 'test data2', 'utf-8');
                fs.rmSync('test-targetDir', { recursive: true, force: true });
                const watcher = syncDirectory(['test-srcDir', 'test-srcDir2'], ['test-targetDir', 'test-targetDir'], {
                    type: 'copy'
                });
                assert.strictEqual(watcher, undefined);
                assertFile(testFile, 'test data');
                assert.notStrictEqual(fs.lstatSync(targetFile).ino, fs.lstatSync(testFile).ino, 'file is a symbolic link');
                assertFile(path.join('test-targetDir', 'test2.txt'), 'test data2');
                assert.notStrictEqual(fs.lstatSync(path.join('test-targetDir', 'test2.txt')).ino, fs.lstatSync(path.join('test-srcDir2', 'test2.txt')).ino, 'file is a symbolic link');
            } finally {
                fs.rmSync('test-srcDir2', { recursive: true, force: true });
            }
        });
    });

    describe('watch-copy', function () {
        it('should copy files', async function () {
            const watcher = syncDirectory('test-srcDir', 'test-targetDir', {
                type: 'copy',
                watch: true,
            });
            assertFile(testFile, 'test data');
            assert.notStrictEqual(fs.lstatSync(targetFile).ino, fs.lstatSync(testFile).ino, 'file is a symbolic link');
            await delay(100);
            fs.writeFileSync(testFile, 'new data');
            await delay(100);
            assertFile(testFile, 'new data');
            assert.notStrictEqual(fs.lstatSync(targetFile).ino, fs.lstatSync(testFile).ino, 'file is a symbolic link');
            await watcher.close();
        });
    });

    describe('sync-hardlink', function () {
        it('should copy files', function () {
            const watcher = syncDirectory('test-srcDir', 'test-targetDir', {
                supportSymlink: true,
            });
            assert.strictEqual(watcher, undefined);
            assertFile(testFile, 'test data');
            assert.strictEqual(fs.lstatSync(targetFile).ino, fs.lstatSync(testFile).ino, 'file is not a symbolic link');
        });
    });

    describe('watch-hardlink', function () {
        it('should copy files', async function () {
            const watcher = syncDirectory('test-srcDir', 'test-targetDir', {
                watch: true,
                supportSymlink: true,
            });
            assertFile(testFile, 'test data');
            assert.strictEqual(fs.lstatSync(targetFile).ino, fs.lstatSync(testFile).ino, 'file is not a symbolic link');
            await delay(100);
            fs.writeFileSync(testFile, 'new data');
            await delay(100);
            assertFile(testFile, 'new data');
            assert.strictEqual(fs.lstatSync(targetFile).ino, fs.lstatSync(testFile).ino, 'file is not a symbolic link');
            await watcher.close();
        });
    });
});
