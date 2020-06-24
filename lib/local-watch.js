
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const chokidar = require('chokidar');

const excludeUtil = require('./exclude');
const isDirectoryUtil = require('./is-directory');
const { ignoredSymlinkDirs } = require('./config');

function copyFile(filePath, srcDir, targetDir, exclude, forceSync, type) {
    const relativeFilePath = filePath.substring(srcDir.length);
    console.log('~~~ copy file: ', srcDir, filePath, relativeFilePath);
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
    } catch (err) {}
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
        } catch(err) {

        }
    }
}

function watchSrcFolder(srcDir, targetDir, { type, exclude, forceSync, cb, afterSync, deleteOrphaned, onError }) {
    const chokidarWatcher = chokidar.watch(srcDir, {
        persistent: true,
        alwaysStat: true,
        ignored: exclude
    });

    const shouldExclude = (filePath) => {
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

    chokidarWatcher.on('ready', () => {
        chokidarWatcher.on('add', filePath => {
            if (shouldExclude(filePath)) {
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
            } catch(err) {
                onError(err);
            }
        });
        chokidarWatcher.on('change', filePath => {
            if (shouldExclude(filePath)) {
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
            } catch(err) {
                onError(err);
            }
        });
        chokidarWatcher.on('unlink', filePath => {
            if (shouldExclude(filePath)) {
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
            } catch(err) {
                onError(err);
            }
        });
        chokidarWatcher.on('unlinkDir', filePath => {
            if (shouldExclude(filePath)) {
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
            } catch(err) {
                onError(err);
            }
        });
    });

    return chokidarWatcher;
}

module.exports = watchSrcFolder;
