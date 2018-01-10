
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const chokidar = require('chokidar');

const excludeUtil = require('./exclude');

function copyFile(filePath, srcDir, targetDir, exclude) {
    const relativeFilePath = filePath.substring(srcDir.length);
    const targetPath = path.join(targetDir, relativeFilePath);

    if (excludeUtil.test(relativeFilePath, exclude)) {
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

    if (excludeUtil.test(relativeFilePath, exclude)) {
        return;
    }

    if (targetFile && fs.existsSync(targetFile)) {

        try {
            fse.removeSync(targetFile);
        } catch(err) {

        }
    }
}

function watchSrcFolder(srcDir, targetDir, { type, exclude }) {

    const chokidarWatcher = chokidar.watch(srcDir, {
        persistent: true,
        alwaysStat: true
    });

    chokidarWatcher.on('ready', () => {

        chokidarWatcher.on('add', filePath => {
            copyFile(filePath, srcDir, targetDir, exclude);
        });
        chokidarWatcher.on('change', filePath => {
            copyFile(filePath, srcDir, targetDir, exclude);
        });
        chokidarWatcher.on('unlink', filePath => {
            removeFile(filePath, srcDir, targetDir, exclude);
        });
        chokidarWatcher.on('unlinkDir', filePath => {
            removeFile(filePath, srcDir, targetDir, exclude);
        });
    });

    return chokidarWatcher;
}

module.exports = watchSrcFolder;
