
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

    fse.copySync(filePath, targetPath);
}

function removeFile(filePath, srcDir, targetDir, exclude) {

    const relativeFilePath = filePath.substring(srcDir.length);
    const targetFile = path.join(targetDir, relativeFilePath);

    if (excludeUtil.test(relativeFilePath, exclude)) {
        return;
    }

    if (targetFile) {
        fse.removeSync(targetFile);
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
