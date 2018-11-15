
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const chokidar = require('chokidar');

const excludeUtil = require('./exclude');
const isDirectoryUtil = require('./is-directory');

function copyFile(filePath, srcDir, targetDir, exclude, type) {
    const relativeFilePath = filePath.substring(srcDir.length);
    const targetPath = path.join(targetDir, relativeFilePath);

    const isDirectory = isDirectoryUtil(filePath);
    
    if (excludeUtil.test(`${relativeFilePath}${isDirectory ? '/' : ''}`, exclude)) {
        console.log('filtered ', `${relativeFilePath}${isDirectory ? '/' : ''}`);
        return;
    }

    try {
        if (type === 'hardlink') {
            fse.removeSync(targetPath);
        }
        fse.copySync(filePath, targetPath, { overwrite: true });
    } catch (err) {
        console.log(filePath, targetPath, targetDir);
        console.log(err);
    }
}

function removeFile(filePath, srcDir, targetDir, exclude) {

    const relativeFilePath = filePath.substring(srcDir.length);
    const targetFile = path.join(targetDir, relativeFilePath);

    const isDirectory = isDirectoryUtil(filePath);

    if (excludeUtil.test(`${relativeFilePath}${isDirectory ? '/' : ''}`, exclude)) {
        return;
    }

    if (targetFile && fs.existsSync(targetFile)) {
        try {
            fse.removeSync(targetFile);
        } catch(err) {

        }
    }
}

function watchSrcFolder(srcDir, targetDir, { type, exclude, cb, afterSync, deleteOrphaned }) {
    const chokidarWatcher = chokidar.watch(srcDir, {
        persistent: true,
        alwaysStat: true
    });

    chokidarWatcher.on('ready', () => {
        chokidarWatcher.on('add', filePath => {
            copyFile(filePath, srcDir, targetDir, exclude, type);
            cb({
                type: 'add',
                path: filePath,
            });
            afterSync({
                type: 'add',
                relativePath: filePath.replace(srcDir, ''),
            });
        });
        chokidarWatcher.on('change', filePath => {
            copyFile(filePath, srcDir, targetDir, exclude, type);
            cb({
                type: 'change',
                path: filePath,
            });
            afterSync({
                type: 'change',
                relativePath: filePath.replace(srcDir, ''),
            });
        });
        chokidarWatcher.on('unlink', filePath => {
            if (deleteOrphaned) {
                removeFile(filePath, srcDir, targetDir, exclude);

                afterSync({
                    type: 'unlink',
                    relativePath: filePath.replace(srcDir, ''),
                });
            }

            cb({
                type: 'unlink',
                path: filePath,
            });
        });
        chokidarWatcher.on('unlinkDir', filePath => {
            if (deleteOrphaned) {
                removeFile(filePath, srcDir, targetDir, exclude);
                afterSync({
                    type: 'unlinkDir',
                    relativePath: filePath.replace(srcDir, ''),
                });   
            }
            cb({
                type: 'unlinkDir',
                path: filePath,
            });
        });
    });

    return chokidarWatcher;
}

module.exports = watchSrcFolder;
