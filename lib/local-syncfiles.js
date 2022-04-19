
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');

const isDirectoryUtil = require('./is-directory');

const readdirEnhanced = require('readdir-enhanced');
const readdirSync = (dir, filter) => {
    return readdirEnhanced.sync(dir, {
        deep: true,
        filter: filter || (() => true),
        basePath: dir
    });
};

const readdirAync = async (dir, filter) => {
    return await readdirEnhanced.async(dir, {
        deep: true,
        filter: filter || (() => true),
        basePath: dir
    });
};

const excludeUtil = require('./exclude');
const { ignoredSymlinkDirs } = require('./config');

const utimeFile = filePath => {
    const time = ((Date.now() - 10 * 1000)) / 1000;
    fs.utimesSync(filePath, time, time);
};

const createTargetHardlinkFiles = ({ relativeFilePath, srcPath, targetPath, supportSymlink }) => {
    try {
        const stats = fs.lstatSync(srcPath);
        const isSymlink = stats.isSymbolicLink();
        
        if (supportSymlink && isSymlink) { // if targetPath is a symlink dir
            fse.ensureSymlinkSync(srcPath, targetPath);
            ignoredSymlinkDirs.push(srcPath);
        } else {
            if (stats.isFile()) { // if targetPath is file
                if (fs.existsSync(targetPath)) { // recreate a new hardlink
                    if (stats.ino !== fs.statSync(targetPath).ino) {
                        fse.removeSync(targetPath);
                        fse.ensureLinkSync(srcPath, targetPath);
                        utimeFile(targetPath);
                    }
                } else { // create a hardlink
                    fse.ensureLinkSync(srcPath, targetPath);
                    utimeFile(targetPath);
                }

            } else if (stats.isDirectory()) { // if targetPath is a new dir
                fse.ensureDirSync(targetPath);
            }
        }
    } catch(err) {
        // no log output for safe
    }
};

const copyToTargetFiles = (srcPath, targetPath) => {
    try {
        if (fs.existsSync(srcPath)) {
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

const syncProcessor = (srcDir, targetDir, { type, exclude, forceSync, afterSync, deleteOrphaned, supportSymlink, filter, onError }) => {
    try {
        const srcFiles = readdirSync(srcDir, stats => {
            const filePath = stats.path;
            const isDirectory = isDirectoryUtil(filePath);
            const relativePath = `${filePath.replace(srcDir, '')}${isDirectory ? '/' : ''}`;

            // level 1
            if (forceSync(relativePath)) {
                return true;
            }

            // level 2
            if (excludeUtil.test(relativePath, exclude)) {
                return false;
            }

            return true;
        });
        const targetFiles = readdirSync(targetDir);

        // array to json
        const srcJson = {};
        const targetJson = {};

        for (let i = 0, len = srcFiles.length; i < len; i++) {
            const filePath = srcFiles[i];

            if (!fs.existsSync(filePath)) {
                continue;
            }

            const isDirectory = isDirectoryUtil(filePath);
            const relativePath = `${filePath.replace(srcDir, '')}${isDirectory ? '/' : ''}`;

            const isForceSync = forceSync(relativePath);

            if (!isForceSync && excludeUtil.test(relativePath, exclude)) {
                continue;
            }

            srcJson[filePath.replace(srcDir, '')] = false;
        }
        
        targetFiles.forEach(function (filePath, index) {
            targetJson[filePath.replace(targetDir, '')] = false;
        });

        // link or copy files
        for (let relativeFilePath in srcJson) {
            targetJson[relativeFilePath] = true;

            const srcPath = path.join(srcDir, relativeFilePath);
            const targetPath = path.join(targetDir, relativeFilePath);
            const nodeType = isDirectoryUtil(srcPath) ? 'dir' : 'file';

            if (filter(srcPath)) {
                if (type === 'hardlink') {
                    createTargetHardlinkFiles({ relativeFilePath, srcPath, targetPath, supportSymlink });

                    afterSync({
                        eventType: 'init:hardlink',
                        nodeType,
                        relativePath: relativeFilePath,
                        srcPath,
                        targetPath,
                    });
                } else if (type === 'copy') {
                    copyToTargetFiles(srcPath, targetPath);

                    afterSync({
                        eventType: 'init:copy',
                        nodeType,
                        relativePath: relativeFilePath,
                        srcPath,
                        targetPath,
                    });
                }
            }
        }

        if (deleteOrphaned) {
            for (let relativeFilePath in targetJson) {
                if (!targetJson[relativeFilePath]) {
                    // if file is in ignoredSymlinkDirs, ignore
                    const isSymlink = excludeUtil.test(relativeFilePath, ignoredSymlinkDirs);
                    const isExcluded = excludeUtil.test(relativeFilePath, exclude);
                    
                    if (!isSymlink && !isExcluded) {
                        removeFile(path.join(targetDir, relativeFilePath));
                    }
                }
            }
        }
    } catch(err) {
        onError(err);
    }
};

// same as syncProcessor
const asyncProcessor = async (srcDir, targetDir, { type, exclude, forceSync, afterSync, deleteOrphaned, supportSymlink, filter, onError }) => {
    try {
        const srcFiles = await readdirAync(srcDir, stats => {
            const filePath = stats.path;
            const isDirectory = isDirectoryUtil(filePath);
            const relativePath = `${filePath.replace(srcDir, '')}${isDirectory ? '/' : ''}`;

            // level 1
            if (forceSync(relativePath)) {
                return true;
            }

            // level 2
            if (excludeUtil.test(relativePath, exclude)) {
                return false;
            }

            return true;
        });

        const targetFiles = await readdirAync(targetDir);

        // array to json
        const srcJson = {};
        const targetJson = {};

        for (let i = 0, len = srcFiles.length; i < len; i++) {
            const filePath = srcFiles[i];

            if (!fs.existsSync(filePath)) {
                continue;
            }

            const isDirectory = isDirectoryUtil(filePath);
            const relativePath = `${filePath.replace(srcDir, '')}${isDirectory ? '/' : ''}`;

            const isForceSync = await forceSync(relativePath);

            if (!isForceSync && excludeUtil.test(relativePath, exclude)) {
                continue;
            }

            srcJson[filePath.replace(srcDir, '')] = false;
        }

        targetFiles.forEach(function (filePath, index) {
            targetJson[filePath.replace(targetDir, '')] = false;
        });

        // link or copy files
        for (let relativeFilePath in srcJson) {
            targetJson[relativeFilePath] = true;

            const srcPath = path.join(srcDir, relativeFilePath);
            const targetPath = path.join(targetDir, relativeFilePath);
            const nodeType = isDirectoryUtil(srcPath) ? 'dir' : 'file';

            if (await filter(srcPath)) {
                if (type === 'hardlink') {
                    createTargetHardlinkFiles({ relativeFilePath, srcPath, targetPath, supportSymlink });

                    await afterSync({
                        eventType: 'init:hardlink',
                        nodeType,
                        relativePath: relativeFilePath,
                        srcPath,
                        targetPath,
                    });
                } else if (type === 'copy') {
                    copyToTargetFiles(srcPath, targetPath);

                    await afterSync({
                        eventType: 'init:copy',
                        nodeType,
                        relativePath: relativeFilePath,
                        srcPath,
                        targetPath,
                    });
                }
            }
        }

        if (deleteOrphaned) {
            for (let relativeFilePath in targetJson) {
                if (!targetJson[relativeFilePath]) {
                    // if file is in ignoredSymlinkDirs, ignore
                    const isSymlink = excludeUtil.test(relativeFilePath, ignoredSymlinkDirs);
                    const isExcluded = excludeUtil.test(relativeFilePath, exclude);

                    if (!isSymlink && !isExcluded) {
                        removeFile(path.join(targetDir, relativeFilePath));
                    }
                }
            }
        }
    } catch(err) {
        await onError(err);
    }
};

module.exports.sync = (srcDir, targetDir, options) => {
    fse.ensureDirSync(targetDir);
    syncProcessor(srcDir, targetDir, options);
};

module.exports.async = async (srcDir, targetDir, options) => {
    fse.ensureDirSync(targetDir);
    await asyncProcessor(srcDir, targetDir, options);
};
