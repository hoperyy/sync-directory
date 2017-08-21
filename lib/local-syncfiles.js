
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');

const readdirEnhanced = require('readdir-enhanced').sync;
const readdirSync = (dir, filter) => {
    return readdirEnhanced(dir, {
        deep: filter || true,
        basePath: dir
    });
};

const excludeUtil = require('./exclude');

const linkDirFiles = (relativeFilePath, srcPath, targetPath) => {
    try {
        const stats = fs.statSync(srcPath);
        if (stats.isFile()) {

            if (fs.existsSync(targetPath)) {
                if (stats.ino !== fs.statSync(targetPath).ino) {
                    fse.removeSync(targetPath);
                    fse.ensureLinkSync(srcPath, targetPath);
                }
            } else {
                fse.ensureLinkSync(srcPath, targetPath);
            }

        } else if (stats.isDirectory()) {
            fse.ensureDirSync(targetPath);
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

const syncFiles = function(srcDir, targetDir, { type, exclude }) {

    const srcFiles = readdirSync(srcDir, stats => {
        const filePath = stats.path;

        if (excludeUtil.test(filePath.replace(srcDir, ''), exclude)) {
            return false;
        }

        return true;
    });
    const targetFiles = readdirSync(targetDir);

    // array to json
    const srcJson = {};
    const wsJson = {};
    srcFiles.forEach(function(filePath, index) {
        if (!fs.existsSync(filePath)) {
            return;
        }

        if (excludeUtil.test(filePath.replace(srcDir, ''), exclude)) {
            return;
        }

        srcJson[filePath.replace(srcDir, '')] = false;

    });
    targetFiles.forEach(function(filePath, index) {
        wsJson[filePath.replace(targetDir, '')] = false;
    });

    // link or copy files
    for(let relativeFilePath in srcJson) {
        wsJson[relativeFilePath] = true;

        const srcPath = path.join(srcDir, relativeFilePath);
        const targetPath = path.join(targetDir, relativeFilePath);

        if (type === 'hardlink') {
            linkDirFiles(relativeFilePath, srcPath, targetPath);
        } else if (type === 'copy') {
            copyDirFiles(srcPath, targetPath);
        }

    }

    for(let relativeFilePath in wsJson) {
        if (!wsJson[relativeFilePath]) {
            removeFile(path.join(targetDir, relativeFilePath));
        }
    }

};

module.exports = (srcDir, targetDir, { type, exclude }) => {
    fse.ensureDirSync(targetDir);
    syncFiles(srcDir, targetDir, { type, exclude });
};
