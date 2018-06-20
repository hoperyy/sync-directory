
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const chokidar = require('chokidar');

const excludeUtil = require('./exclude');

function copyFile(filePath, srcDir, targetDir, exclude) {
    const relativeFilePath = filePath.substring(srcDir.length);
    const targetPath = path.join(targetDir, relativeFilePath);

    const isDirectory = fs.statSync(filePath).isDirectory();
    
    if (excludeUtil.test(`${relativeFilePath}${isDirectory ? '/' : ''}`, exclude)) {
        return;
    }

    try {
        fse.copySync(filePath, targetPath);
    } catch (err) {

    }
}

function removeFile(filePath, srcDir, targetDir, exclude) {

    const relativeFilePath = filePath.substring(srcDir.length);
    const targetFile = path.join(targetDir, relativeFilePath);

    const isDirectory = fs.statSync(filePath).isDirectory();

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

function watchSrcFolder(srcDir, targetDir, { type, exclude, cb }) {

    const chokidarWatcher = chokidar.watch(srcDir, {
        persistent: true,
        alwaysStat: true
    });

    chokidarWatcher.on('ready', () => {

        chokidarWatcher.on('add', filePath => {
            copyFile(filePath, srcDir, targetDir, exclude);
            cb({
                type: 'add',
                path: filePath,
            });
        });
        chokidarWatcher.on('change', filePath => {
            copyFile(filePath, srcDir, targetDir, exclude);
            cb({
                type: 'change',
                path: filePath,
            });
        });
        chokidarWatcher.on('unlink', filePath => {
            removeFile(filePath, srcDir, targetDir, exclude);
            cb({
                type: 'unlink',
                path: filePath,
            });
        });
        chokidarWatcher.on('unlinkDir', filePath => {
            removeFile(filePath, srcDir, targetDir, exclude);
            cb({
                type: 'unlinkDir',
                path: filePath,
            });
        });
    });

    return chokidarWatcher;
}

module.exports = watchSrcFolder;
