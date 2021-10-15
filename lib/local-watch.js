
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const chokidar = require('chokidar');

const excludeUtil = require('./exclude');
const isDirectoryUtil = require('./is-directory');
const { ignoredSymlinkDirs } = require('./config');

const copyFile = (filePath, srcDir, targetDir, exclude, forceSync, type) => {
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
    } catch (err) {}
};

const removeFile = (filePath, srcDir, targetDir, exclude, forceSync) => {
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
};

const processor = (srcDir, targetDir, { type, exclude, forceSync, afterSync, deleteOrphaned, onError, chokidarWatchOptions }) => {
    const watchOptions = Object.assign({
        persistent: true,
        alwaysStat: true,
        ignored: exclude
    }, chokidarWatchOptions);

    const chokidarWatcher = chokidar.watch(srcDir, watchOptions);

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
        chokidarWatcher.on('add', async filePath => {
            if (shouldExclude(filePath)) {
                return;
            }
            // if file is in ignoredSymlinkDirs, ignore
            if (excludeUtil.test(filePath, ignoredSymlinkDirs)) {
                return;
            }

            try {
                copyFile(filePath, srcDir, targetDir, exclude, forceSync, type);

                await afterSync({
                    type: 'add',
                    absolutePath: filePath,
                    relativePath: filePath.replace(srcDir, ''),
                });   
            } catch(err) {
                await onError(err);
            }
        });
        chokidarWatcher.on('change', async filePath => {
            if (shouldExclude(filePath)) {
                return;
            }
            // if file is in ignoredSymlinkDirs, ignore
            if (excludeUtil.test(filePath, ignoredSymlinkDirs)) {
                return;
            }
            try {
                copyFile(filePath, srcDir, targetDir, exclude, forceSync, type);

                await afterSync({
                    type: 'change',
                    absolutePath: filePath,
                    relativePath: filePath.replace(srcDir, ''),
                });
            } catch(err) {
                await onError(err);
            }
        });
        chokidarWatcher.on('unlink', async filePath => {
            if (shouldExclude(filePath)) {
                return;
            }

            // if file is in ignoredSymlinkDirs, ignore
            if (excludeUtil.test(filePath, ignoredSymlinkDirs)) {
                return;
            }

            try {
                removeFile(filePath, srcDir, targetDir, exclude, forceSync);

                afterSync({
                    type: 'unlink',
                    absolutePath: filePath,
                    relativePath: filePath.replace(srcDir, ''),
                });
            } catch(err) {
                await onError(err);
            }
        });
        chokidarWatcher.on('unlinkDir', async filePath => {
            if (shouldExclude(filePath)) {
                return;
            }
            // if file is in ignoredSymlinkDirs, ignore
            if (excludeUtil.test(filePath, ignoredSymlinkDirs)) {
                return;
            }
            try {
                removeFile(filePath, srcDir, targetDir, exclude, forceSync);

                await afterSync({
                    type: 'unlinkDir',
                    absolutePath: filePath,
                    relativePath: filePath.replace(srcDir, ''),
                });
            } catch(err) {
                await onError(err);
            }
        });
    });

    return chokidarWatcher;
};

module.exports = processor;
