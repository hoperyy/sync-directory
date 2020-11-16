const path = require('path');
const syncLocalFiles = require('./lib/local-syncfiles');
const watchLocalFiles = require('./lib/local-watch');
const isAbsoluteUrl = require('is-absolute');

// Copied from https://stackoverflow.com/a/42355848
const isChildOf = (child, parent) => {
    if (child === parent) return false;
    const parentTokens = parent.split('/').filter(i => i.length);
    return parentTokens.every((t, i) => child.split('/')[i] === t);
};

/**
 * Sync directories
 * @param {string[] | string} srcDirs Source directory(s)
 * @param {string[] | string} targetDirs Target directory(s)
 * @param {import("./types").Configuration} [config] Configuration
 */
module.exports = (
    srcDirs,
    targetDirs,
    {
        type = 'hardlink',
        forceSync = () => { },
        exclude = null,
        watch = false,
        deleteOrphaned = true,
        supportSymlink = false,
        cb = () => { },
        afterSync = () => { },
        filter = () => true,
        onError = (err) => { throw new Error(err); },
    } = {}
) => {
    if (typeof srcDirs === 'string') {
        srcDirs = [srcDirs];
    }
    if (typeof targetDirs === 'string') {
        targetDirs = [targetDirs];
    }
    if (srcDirs.length !== targetDirs.length) {
        throw new Error('[sync-directory] the number of source folder paths must match the number of target folder paths');
    }
    for (let i = 0; i < srcDirs.length; i++) {
        if (!isAbsoluteUrl(srcDirs[i])) {
            srcDirs[i] = path.resolve(srcDirs[i]);
        }

        if (!isAbsoluteUrl(targetDirs[i])) {
            targetDirs[i] = path.resolve(targetDirs[i]);
        }
    }
    for (let i = 0; i < srcDirs.length; i++) {
        for (let j = i + 1; j < srcDirs.length; j++) {
            const srcDir = srcDirs[i];
            const srcDir2 = srcDirs[j];
            if (isChildOf(srcDir, srcDir2) || isChildOf(srcDir2, srcDir)) {
                throw new Error('[sync-directory] "srcDir"s must not overlap.');
            }
        }
    }
    syncLocalFiles(srcDirs, targetDirs, { type, exclude, forceSync, afterSync, deleteOrphaned, supportSymlink, filter, onError });

    if (watch) {
        const watcher = watchLocalFiles(srcDirs, targetDirs, { type, exclude, forceSync, cb, afterSync, deleteOrphaned, filter, onError });
        return watcher;
    } else {
        return undefined;
    }
};
