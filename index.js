const syncLocalFiles = require('./lib/local-syncfiles');
const watchLocalFiles = require('./lib/local-watch');
const isAbsoluteUrl = require('is-absolute');
const fse = require('fs-extra');

module.exports = (
    srcDir, 
    targetDir, 
    { 
        type = 'hardlink',
        forceSync = () => {},
        exclude = null,
        watch = false,
        deleteOrphaned = true,
        supportSymlink = false,
        cb = () => { }, 
        afterSync = () => {}, 
        filter = () => true,
        onError = (err) => { throw new Error(err) }
    } = {}
) => {
    // check absolute path
    if (!isAbsoluteUrl(srcDir) || !isAbsoluteUrl(targetDir)) {
        console.log('[sync-directory] "srcDir/targetDir" must be absolute path.');
        return;
    }

    fse.ensureDirSync(targetDir);

    syncLocalFiles(srcDir, targetDir, { type, exclude, forceSync, afterSync, deleteOrphaned, supportSymlink, filter, onError });

    if (watch) {
        const watcher = watchLocalFiles(srcDir, targetDir, { type, exclude, forceSync, cb, afterSync, deleteOrphaned, filter, onError });
        return watcher;
    }

};
