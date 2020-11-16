
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const chokidar = require('chokidar');

const excludeUtil = require('./exclude');
const isDirectoryUtil = require('./is-directory');
const { ignoredSymlinkDirs } = require('./config');

function copyFile(filePath, srcDir, targetDir, exclude, forceSync, type) {
    const relativeFilePath = filePath.substring(srcDir.length);
    const targetPath = path.join(targetDir, relativeFilePath);

    const isDirectory = isDirectoryUtil(filePath);

    const relativePath = `${relativeFilePath}${isDirectory ? '/' : ''}`;

    if (!forceSync(relativePath) && excludeUtil.test(relativePath, exclude)) {
        return;
    }

    try {
        if (type === 'hardlink') {
            fse.removeSync(targetPath);
        }
        fse.copySync(filePath, targetPath, { overwrite: true });
    } catch (err) { }
}

function removeFile(filePath, srcDir, targetDir, exclude, forceSync) {
    const relativeFilePath = filePath.substring(srcDir.length);
    const targetFile = path.join(targetDir, relativeFilePath);

    const isDirectory = isDirectoryUtil(filePath);
    const relativePath = `${relativeFilePath}${isDirectory ? '/' : ''}`;

    if (!forceSync(relativePath) && excludeUtil.test(relativePath, exclude)) {
        return;
    }

    if (targetFile && fs.existsSync(targetFile)) {
        try {
            fse.removeSync(targetFile);
        } catch (err) {

        }
    }
}

function watchSrcFolder(srcDirs, targetDirs, { type, exclude, forceSync, cb, afterSync, deleteOrphaned, onError }) {
    const chokidarWatcher = chokidar.watch(srcDirs, {
        persistent: true,
        alwaysStat: true,
        ignored: exclude
    });

    const srcDirCache = new Map();
    function getSrcDir(filePath) {
        if (!srcDirCache.has(filePath)) {
            const thisSrcDirs = [];
            const thisTargetDirs = [];
            for (let i = 0; i < srcDirs.length; i++) {
                if (filePath.startsWith(srcDirs[i])) {
                    thisSrcDirs.push(srcDirs[i]);
                    thisTargetDirs.push(targetDirs[i]);
                    break;
                }
            }
            srcDirCache.set(filePath, { srcDirs: thisSrcDirs, targetDirs: thisTargetDirs });
        }
        return srcDirCache.get(filePath);
    }

    const shouldExclude = (filePath, srcDir) => {
        const relativeFilePath = filePath.substring(srcDir.length);

        const isDirectory = isDirectoryUtil(filePath);
        const relativePath = `${relativeFilePath}${isDirectory ? '/' : ''}`;

        if (forceSync(relativePath)) {
            return false;
        }

        if (excludeUtil.test(relativePath, exclude)) {
            return true;
        }

        return false;
    };

    function listenerHelper(cb) {
        return function (filePath) {
            const { srcDirs: thisSrcDirs, targetDirs: thisTargetDirs } = getSrcDir(filePath);
            for (let i = 0; i < thisSrcDirs.length; i++) {
                cb(filePath, thisSrcDirs[i], thisTargetDirs[i]);
            }
        };
    }

    chokidarWatcher.on('ready', () => {
        chokidarWatcher.on('add', listenerHelper((filePath, srcDir, targetDir) => {
            if (shouldExclude(filePath, srcDir)) {
                return;
            }
            // if file is in ignoredSymlinkDirs, ignore
            if (excludeUtil.test(filePath, ignoredSymlinkDirs)) {
                return;
            }

            try {
                copyFile(filePath, srcDir, targetDir, exclude, forceSync, type);
                cb({
                    type: 'add',
                    path: filePath,
                });
                afterSync({
                    type: 'add',
                    relativePath: filePath.replace(srcDir, ''),
                });
            } catch (err) {
                onError(err);
            }
        }));
        chokidarWatcher.on('change', listenerHelper((filePath, srcDir, targetDir) => {
            if (shouldExclude(filePath, srcDir)) {
                return;
            }
            // if file is in ignoredSymlinkDirs, ignore
            if (excludeUtil.test(filePath, ignoredSymlinkDirs)) {
                return;
            }
            try {
                copyFile(filePath, srcDir, targetDir, exclude, forceSync, type);
                cb({
                    type: 'change',
                    path: filePath,
                });
                afterSync({
                    type: 'change',
                    relativePath: filePath.replace(srcDir, ''),
                });
            } catch (err) {
                onError(err);
            }
        }));
        chokidarWatcher.on('unlink', listenerHelper((filePath, srcDir, targetDir) => {
            if (shouldExclude(filePath, srcDir)) {
                return;
            }

            // if file is in ignoredSymlinkDirs, ignore
            if (excludeUtil.test(filePath, ignoredSymlinkDirs)) {
                return;
            }

            try {
                if (deleteOrphaned) {
                    removeFile(filePath, srcDir, targetDir, exclude, forceSync);

                    afterSync({
                        type: 'unlink',
                        relativePath: filePath.replace(srcDir, ''),
                    });
                }

                cb({
                    type: 'unlink',
                    path: filePath,
                });
            } catch (err) {
                onError(err);
            }
        }));
        chokidarWatcher.on('unlinkDir', listenerHelper((filePath, srcDir, targetDir) => {
            if (shouldExclude(filePath, srcDir)) {
                return;
            }
            // if file is in ignoredSymlinkDirs, ignore
            if (excludeUtil.test(filePath, ignoredSymlinkDirs)) {
                return;
            }
            try {
                if (deleteOrphaned) {
                    removeFile(filePath, srcDir, targetDir, exclude, forceSync);
                    afterSync({
                        type: 'unlinkDir',
                        relativePath: filePath.replace(srcDir, ''),
                    });
                }
                cb({
                    type: 'unlinkDir',
                    path: filePath,
                });
            } catch (err) {
                onError(err);
            }
        }));
    });

    return chokidarWatcher;
}

module.exports = watchSrcFolder;
