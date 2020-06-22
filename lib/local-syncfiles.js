
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');

const isDirectoryUtil = require('./is-directory');

const readdirEnhanced = require('readdir-enhanced').sync;
const readdirSync = (dir, filter) => {
    return readdirEnhanced(dir, {
        deep: filter || true,
        basePath: dir
    });
};

const excludeUtil = require('./exclude');
const { ignoredSymlinkDirs } = require('./config');

const utimeFile = filePath => {
    const time = ((Date.now() - 10 * 1000)) / 1000;
    fs.utimesSync(filePath, time, time);
};

const linkDirFiles = (relativeFilePath, srcPath, targetPath, supportSymlink) => {
    try {
        const stats = fs.lstatSync(srcPath);
        const isSymlink = stats.isSymbolicLink();
        
        if (supportSymlink && isSymlink) {
            fse.ensureSymlinkSync(srcPath, targetPath);
            ignoredSymlinkDirs.push(srcPath);
        } else {
            if (stats.isFile()) {
                if (fs.existsSync(targetPath)) {
                    if (stats.ino !== fs.statSync(targetPath).ino) {
                        fse.removeSync(targetPath);
                        fse.ensureLinkSync(srcPath, targetPath);
                        utimeFile(targetPath);
                    }
                } else {
                    fse.ensureLinkSync(srcPath, targetPath);
                    utimeFile(targetPath);
                }

            } else if (stats.isDirectory()) {
                fse.ensureDirSync(targetPath);
            }
        }
    } catch(err) {
        // no log output for safe
    }
};

const copyDirFiles = (srcPath, targetPath) => {
    try {
        if (fs.existsSync(srcPath) && !fs.existsSync(targetPath)) {
            fse.copySync(srcPath, targetPath);
        }
    } catch(err) {
        // no log output for safe
    }
};

const removeFile = filePath => {
    try {
        fse.removeSync(filePath);
    } catch(err) {
        // no log output for safe
    }
};

const syncFiles = function (srcDir, targetDir, { type, exclude, forceSync, afterSync, deleteOrphaned, supportSymlink, filter, onError }) {
    try {
        const srcFiles = readdirSync(srcDir, stats => {
            const filePath = stats.path;
            const isDirectory = isDirectoryUtil(filePath);
            const relativePath = `${filePath.replace(srcDir, '')}${isDirectory ? '/' : ''}`;

            if (forceSync(relativePath)) {
                return true;
            }

            if (excludeUtil.test(relativePath, exclude)) {
                return false;
            }

            return true;
        });
        const targetFiles = readdirSync(targetDir);

        // array to json
        const srcJson = {};
        const wsJson = {};
        srcFiles.forEach(function (filePath, index) {
            if (!fs.existsSync(filePath)) {
                return;
            }

            const isDirectory = isDirectoryUtil(filePath);
            const relativePath = `${filePath.replace(srcDir, '')}${isDirectory ? '/' : ''}`;

            if (!forceSync(relativePath) && excludeUtil.test(relativePath, exclude)) {
                return;
            }

            srcJson[filePath.replace(srcDir, '')] = false;

        });
        targetFiles.forEach(function (filePath, index) {
            wsJson[filePath.replace(targetDir, '')] = false;
        });

        // link or copy files
        for (let relativeFilePath in srcJson) {
            wsJson[relativeFilePath] = true;

            const srcPath = path.join(srcDir, relativeFilePath);
            const targetPath = path.join(targetDir, relativeFilePath);

            if (filter(srcPath)) {
                if (type === 'hardlink') {
                    linkDirFiles(relativeFilePath, srcPath, targetPath, supportSymlink);

                    afterSync({
                        type: 'init:hardlink',
                        relativePath: relativeFilePath,
                    });
                } else if (type === 'copy') {
                    copyDirFiles(srcPath, targetPath);

                    afterSync({
                        type: 'init:copy',
                        relativePath: relativeFilePath,
                    });
                }
            }
        }

        if (deleteOrphaned) {
            for (let relativeFilePath in wsJson) {
                if (!wsJson[relativeFilePath]) {
                    // if file is in ignoredSymlinkDirs, ignore
                    if (!excludeUtil.test(relativeFilePath, ignoredSymlinkDirs)) {
                        removeFile(path.join(targetDir, relativeFilePath));
                    }
                }
            }
        }
    } catch(err) {
        onError(err);
    }
};

module.exports = (srcDir, targetDir, { type, exclude, forceSync, afterSync, deleteOrphaned, supportSymlink, filter, onError }) => {
    fse.ensureDirSync(targetDir);
    syncFiles(srcDir, targetDir, { type, exclude, forceSync, afterSync, deleteOrphaned, supportSymlink, filter, onError });
};
