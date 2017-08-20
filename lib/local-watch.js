
const path = require('path');
const fse = require('fs-extra');
const chokidar = require('chokidar');

function copyFile(filePath, srcDir, targetDir) {
    const relativeFilePath = filePath.substring(srcDir.length);
    const targetPath = path.join(targetDir, relativeFilePath);
    fse.copySync(filePath, targetPath);
}

function removeFile(filePath, srcDir, targetDir) {

    const relativeFilePath = filePath.substring(srcDir.length);
    const targetFile = path.join(targetDir, relativeFilePath);

    if (targetFile) {
        fse.removeSync(targetFile);
    }
}

function watchSrcFolder(srcDir, targetDir, { type, ignored }) {

    const chokidarWatcher = chokidar.watch(srcDir, {
        persistent: true,
        alwaysStat: true
    });

    chokidarWatcher.on('ready', () => {

        console.log('内置 ready');

        chokidarWatcher.on('add', filePath => {
            copyFile(filePath, srcDir, targetDir);
        });
        chokidarWatcher.on('change', filePath => {
            console.log('内置 change');
            copyFile(filePath, srcDir, targetDir);
        });
        chokidarWatcher.on('unlink', filePath => {
            removeFile(filePath, srcDir, targetDir);
        });
        chokidarWatcher.on('unlinkDir', filePath => {
            removeFile(filePath, srcDir, targetDir);
        });
    });

    return chokidarWatcher;
}

module.exports = watchSrcFolder;
