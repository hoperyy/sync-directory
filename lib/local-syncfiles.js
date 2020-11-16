
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
    } catch (err) {
        // no log output for safe
    }
};

const copyDirFiles = (srcPath, targetPath) => {
    try {
        if (fs.existsSync(srcPath) && !fs.existsSync(targetPath)) {
            fse.copySync(srcPath, targetPath);
        }
    } catch (err) {
        // no log output for safe
    }
};

const removeFile = filePath => {
    try {
        fse.removeSync(filePath);
    } catch (err) {
        // no log output for safe
    }
};
/**
 * @typedef { import("../types").Configuration } Configuration
 */

/**
 * Sync directories
 * @param {string[]} srcDirs Source directory(s)
 * @param {string[]} targetDirs Target directory(s)
 * @param {Configuration} config Configuration
 */
const syncFiles = function (srcDirs, targetDirs, { type, exclude, forceSync, afterSync, deleteOrphaned, supportSymlink, filter, onError }) {
    try {
        const flatten = (left, right) => left.concat(right);
        const fileMappings = new Map();
        // array to json
        const wsJson = {};
        /**
         * @type [string, string, string][]
         */
        const srcFiles = srcDirs.map((srcDir, index) => {
            const targetDir = targetDirs[index];
            if (!fs.statSync(srcDir).isDirectory()) {
                return [[srcDir, targetDirs[index], srcDir]];
            }
            readdirSync(targetDir).forEach(filePath => {
                wsJson[filePath] = path.relative(targetDir, filePath);
            });
            return readdirSync(srcDir, stats => {
                const filePath = stats.path;
                const isDirectory = isDirectoryUtil(filePath);
                const relPath = path.relative(srcDir, filePath);
                const relativePath = relPath + (isDirectory ? '/' : '');

                if (forceSync(relativePath)) {
                    return true;
                }

                if (excludeUtil.test(relativePath, exclude)) {
                    return false;
                }

                const targetPath = path.join(targetDir, relPath);
                if (fileMappings.has(targetPath)) {
                    const existing = fileMappings.get(targetPath);
                    throw new Error(`[sync-directory] ${filePath} from ${srcDir} conflicts with ${existing[1]} from ${existing[0]}.`);
                }
                fileMappings.set(targetPath, [srcDir, filePath]);
                return true;
            }).map(file => [srcDir, targetDir, file]);
        }).reduce(flatten);

        // link or copy files
        for (const [srcDir, targetDir, absoluteFilePath] of srcFiles) {
            wsJson[absoluteFilePath] = true;
            const relativeFilePath = path.relative(srcDir, absoluteFilePath);
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
            for (const absoluteFilePath in wsJson) {
                if (wsJson[absoluteFilePath] !== true) {
                    const relativeFilePath = wsJson[absoluteFilePath];
                    // if file is in ignoredSymlinkDirs, ignore
                    if (!excludeUtil.test(relativeFilePath, ignoredSymlinkDirs)) {
                        removeFile(absoluteFilePath);
                    }
                }
            }
        }
    } catch (err) {
        onError(err);
    }
};

/**
 * Sync directories
 * @param {string[]} srcDirs Source directory(s)
 * @param {string[]} targetDirs Target directory(s)
 * @param {Configuration} config Configuration
 */
module.exports = (srcDirs, targetDirs, { type, exclude, forceSync, afterSync, deleteOrphaned, supportSymlink, filter, onError }) => {
    for (let i = 0; i < srcDirs.length; i++) {
        if (fse.statSync(srcDirs[i]).isDirectory()) {
            fse.ensureDirSync(targetDirs[i]);
        } else {
            fse.ensureDirSync(path.dirname(targetDirs[i]));
        }
    }
    syncFiles(srcDirs, targetDirs, { type, exclude, forceSync, afterSync, deleteOrphaned, supportSymlink, filter, onError });
};
