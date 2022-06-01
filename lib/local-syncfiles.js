
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');

const isDirectoryUtil = require('./is-directory');
const matchUtil = require('./match-util');
const readdirEnhanced = require('readdir-enhanced');
const { ignoredSymlinkDirs } = require('./config');

const readdirSync = (dir, nodeep, filter) => {
    return readdirEnhanced.sync(dir, {
        deep: nodeep ? 0 : true,
        filter,
        basePath: dir
    });
};

const readdirAsync = async (dir, nodeep, filter) => {
    return await readdirEnhanced.async(dir, {
        deep: nodeep ? 0 : true,
        filter,
        basePath: dir
    });
};

const utimeFile = filePath => {
    const time = ((Date.now() - 10 * 1000)) / 1000;
    fs.utimesSync(filePath, time, time);
};

const createTargetHardlinkFiles = ({ relativeFilePath, srcPath, targetPath, staySymlink }) => {
    try {
        const stats = fs.lstatSync(srcPath);
        const isSymlink = stats.isSymbolicLink();
        
        if (staySymlink && isSymlink) { // if targetPath is a symlink dir
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
            const stats = fs.lstatSync(srcPath);

            if (stats.isFile()) {
                fse.copySync(srcPath, targetPath);
            } else if (stats.isDirectory()) {
                fse.ensureDirSync(targetPath);
            }
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

const filter = (srcDir, exclude, forceSync) => stats => {
    const filePath = stats.path;
    const isDirectory = isDirectoryUtil(filePath);
    const relativePath = `${filePath.replace(srcDir, '')}${isDirectory ? '/' : ''}`;

    // priot 3
    if (forceSync(relativePath)) {
        return true;
    }

    // priot 2
    if (matchUtil.test(relativePath, exclude)) {
        return false;
    }

    return true;
}

const syncProcessor = (srcDir, targetDir, { type, exclude, forceSync, nodeep, afterSync, deleteOrphaned, staySymlink, include }) => {
    const srcFiles = readdirSync(srcDir, nodeep, filter(srcDir, exclude, forceSync));

    const targetFiles = readdirSync(targetDir, nodeep, filter(targetDir, exclude, forceSync));

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

        if (!isForceSync && matchUtil.test(relativePath, exclude)) {
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

        if (include(srcPath)) {
            if (type === 'hardlink') {
                createTargetHardlinkFiles({ relativeFilePath, srcPath, targetPath, staySymlink });

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
                const isSymlink = matchUtil.test(relativeFilePath, ignoredSymlinkDirs);
                // const isExcluded = matchUtil.test(relativeFilePath, exclude);
                
                if (!isSymlink) {
                    removeFile(path.join(targetDir, relativeFilePath));
                }
            }
        }
    }
};

// same as syncProcessor
const asyncProcessor = async (srcDir, targetDir, { type, exclude, forceSync, nodeep, afterSync, deleteOrphaned, staySymlink, include }) => {
    const srcFiles = await readdirAsync(srcDir, nodeep, filter(srcDir, exclude, forceSync));

    const targetFiles = await readdirAsync(targetDir, nodeep, filter(targetDir, exclude, forceSync));

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

        if (!isForceSync && matchUtil.test(relativePath, exclude)) {
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

        if (await include(srcPath)) {
            if (type === 'hardlink') {
                createTargetHardlinkFiles({ relativeFilePath, srcPath, targetPath, staySymlink });

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
                const isSymlink = matchUtil.test(relativeFilePath, ignoredSymlinkDirs);
                const isExcluded = matchUtil.test(relativeFilePath, exclude);

                if (!isSymlink && !isExcluded) {
                    removeFile(path.join(targetDir, relativeFilePath));
                }
            }
        }
    }
};

module.exports.sync = (srcDir, targetDir, options) => {
    try {
        fse.ensureDirSync(targetDir);
        syncProcessor(srcDir, targetDir, options);
    } catch (err) {
        options.onError(err);
    }
};

module.exports.async = async (srcDir, targetDir, options) => {
    try {
        fse.ensureDirSync(targetDir);
        await asyncProcessor(srcDir, targetDir, options);
    } catch (err) {
        options.onError(err);
    }
};
