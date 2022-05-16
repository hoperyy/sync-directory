const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');
const { setTimeout } = require('timers/promises');
const syncDirectory = require('..');

const assertFileContent = (path, content, msg) =>
    assert.strictEqual(fs.readFileSync(path, 'utf-8'), content, msg || 'file must have content');

const assertFileLink = (a, b, msg) =>
    assert.strictEqual(fs.lstatSync(a).ino, fs.lstatSync(b).ino, msg || 'file must be hard link');

const assertNotFileLink = (a, b, msg) =>
    assert.notStrictEqual(fs.lstatSync(a).ino, fs.lstatSync(b).ino, msg || 'file must not be hard link');

const assertDirTree = (dir, tree) => {
    assert.deepEqual(fs.readdirSync(dir).sort(), Object.keys(tree).sort());
    for (const name in tree) {
        const data = tree[name];
        const file = path.join(dir, name);
        if (typeof (data) === 'string') { assertFileContent(file, data); } else { assertDirTree(file, data); }
    }
};

const mkDirTree = (dir, tree) => {
    fs.ensureDirSync(dir);
    for (const name in tree) {
        const data = tree[name];
        const file = path.join(dir, name);
        if (typeof (data) === 'string') { fs.writeFileSync(file, data, 'utf-8'); } else { mkDirTree(file, data); }
    }
};

const tryLinkSync = (a, b) => {
    try {
        fs.ensureLinkSync(a, b);
        return true;
    } catch (e) {
        return false;
    }
};

const testDir = path.resolve(__dirname, 'tmp');
const srcDir = path.join(testDir, 'srcDir');
const targetDir = path.join(testDir, 'targetDir');
const srcFile = path.join(srcDir, 'test.txt');
const targetFile = path.join(targetDir, 'test.txt');
const testTree = {
    srcDir: {
        emptydir: {},
        fulldir: { 'file.txt': 'file data' },
        'test.txt': 'test data',
    },
    targetDir: {},
};

describe('sync-directory', function () {
    beforeEach(function () {
        mkDirTree(testDir, testTree);
        assertDirTree(testDir, testTree);
    });

    afterEach(function () {
        fs.rmSync(testDir, { recursive: true, force: true });
    });

    describe('sync-copy', function () {
        const t = syncDirectory => async function () {
            const watcher = await syncDirectory(srcDir, targetDir, {
                type: 'copy',
            });
            assert.strictEqual(watcher, undefined);
            assertDirTree(targetDir, testTree.srcDir);
            assertNotFileLink(targetFile, srcFile);
        };

        it('should copy files (sync)', t(syncDirectory.sync));
        it('should copy files (async)', t(syncDirectory.async));
    });

    describe('watch-copy', function () {
        const t = syncDirectory => async function () {
            let watcher;
            try {
                watcher = await syncDirectory(srcDir, targetDir, {
                    type: 'copy',
                    watch: true,
                });
                assertDirTree(targetDir, testTree.srcDir);
                assertNotFileLink(targetFile, srcFile);
                await setTimeout(100);
                fs.writeFileSync(srcFile, 'new data');
                await setTimeout(100);
                assertFileContent(targetFile, 'new data');
                assertNotFileLink(targetFile, srcFile);
            } finally {
                await watcher.close();
            };
        };

        it('should copy files and watch changes (sync)', t(syncDirectory.sync));
        it('should copy files and watch changes (async)', t(syncDirectory.async));
    });

    describe('sync-hardlink', function () {
        const t = syncDirectory => async function () {
            // no hardlinks on some hosts
            if (!tryLinkSync(srcFile, srcFile + '.link')) this.skip();

            const watcher = await syncDirectory(srcDir, targetDir, {
                type: 'hardlink',
            });
            assert.strictEqual(watcher, undefined);
            assertDirTree(targetDir, testTree.srcDir);
            assertFileLink(targetFile, srcFile);
        };

        it('should hardlink files (sync)', t(syncDirectory.sync));
        it('should hardlink files (async)', t(syncDirectory.async));
    });

    describe('watch-hardlink', function () {
        const t = syncDirectory => async function () {
            // no hardlinks on some hosts
            if (!tryLinkSync(srcFile, srcFile + '.link')) this.skip();

            let watcher;
            try {
                watcher = await syncDirectory(srcDir, targetDir, {
                    type: 'hardlink',
                    watch: true,
                });
                assertDirTree(targetDir, testTree.srcDir);
                assertFileLink(targetFile, srcFile);
                await setTimeout(100);
                fs.writeFileSync(srcFile, 'new data');
                await setTimeout(100);
                assertFileContent(targetFile, 'new data');
                assertFileLink(targetFile, srcFile);
            } finally {
                await watcher.close();
            };
        };

        it('should hardlink files and watch changes (sync)', t(syncDirectory.sync));
        it('should hardlink files and watch changes (async)', t(syncDirectory.async));
    });
});