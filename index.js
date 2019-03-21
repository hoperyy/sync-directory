const syncLocalFiles = require('./lib/local-syncfiles');
const watchLocalFiles = require('./lib/local-watch');

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');

const testHardlinkSupport = (targetDir) => {
    const srcPath = path.join(targetDir, 'testHardlinkSupportSrcFilePath');
    const targetPath = path.join(targetDir, 'testHardlinkSupportTargetFilePath');

    let support = true;

    // try {
    //     fse.ensureFileSync(targetPath);
    //     fse.ensureLinkSync(srcPath, targetPath);
    // } catch(err) {
    //     support = false;
    // }

    // if (fs.existsSync(srcPath)) {
    //     fse.removeSync(srcPath);
    // }
    // if (fs.existsSync(targetPath)) {
    //     fse.removeSync(targetPath);
    // }

    return support;
};

module.exports = (srcDir, targetDir, { type = 'hardlink', exclude = null, watch = false, deleteOrphaned = true, cb = () => { }, afterSync = () => {}, filter = () => true } = {}) => {
    // test if support hardlink mode
    fse.ensureDirSync(targetDir);

    if (!testHardlinkSupport(targetDir)) {
        type = 'copy';
    }

    syncLocalFiles(srcDir, targetDir, { type, exclude, afterSync, deleteOrphaned, filter });

    if (watch) {
		const watcher = watchLocalFiles(srcDir, targetDir, { type, exclude, cb, afterSync, deleteOrphaned, filter });
        return watcher;
    }

};
