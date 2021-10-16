const syncLocalFiles = require('./lib/local-syncfiles');
const watchLocalFiles = require('./lib/local-watch');
const isAbsoluteUrl = require('is-absolute');
const fse = require('fs-extra');

const synced = (
    srcDir, 
    targetDir, 
    { 
        type = 'hardlink',
        exclude = null,
        watch = false,
        deleteOrphaned = true,
        supportSymlink = false,
        chokidarWatchOptions = {},
        promised = false,
        forceSync = () => {},
        afterEachSync = () => {},
        filter = () => true,
        onError = (err) => { throw new Error(err) }
    } = {}
) => {
    try {
        afterSync = afterEachSync;
        const options = { type, exclude, forceSync, afterSync, deleteOrphaned, supportSymlink, filter, onError, promised };

        // check absolute path
        if (!isAbsoluteUrl(srcDir) || !isAbsoluteUrl(targetDir)) {
            onError({ message: '[sync-directory] "srcDir/targetDir" must be absolute path.' });
            return;
        }

        fse.ensureDirSync(targetDir);

        syncLocalFiles.sync(srcDir, targetDir, options);

        if (watch) {
            return watchLocalFiles(srcDir, targetDir, { ...options, chokidarWatchOptions });
        }
    } catch(err) {
        onError(err); // never throw error
    }
};

const asynced = (
    srcDir, 
    targetDir, 
    { 
        type = 'hardlink',
        exclude = null,
        watch = false,
        deleteOrphaned = true,
        supportSymlink = false,
        chokidarWatchOptions = {},
        promised = false,
        forceSync = () => {},
        afterEachSync = () => {},
        filter = () => true,
        onError = (err) => { throw new Error(err) }
    } = {}
) => {
    return new Promise(async (resolve, reject) => {
        try {
            afterSync = afterEachSync;
            const options = { type, exclude, forceSync, afterSync, deleteOrphaned, supportSymlink, filter, onError, promised };

            // check absolute path
            if (!isAbsoluteUrl(srcDir) || !isAbsoluteUrl(targetDir)) {
                onError({ message: '[sync-directory] "srcDir/targetDir" must be absolute path.' });
                resolve(); // never throw error
                return;
            }

            fse.ensureDirSync(targetDir);

            await syncLocalFiles.async(srcDir, targetDir, options);

            if (watch) {
                resolve(watchLocalFiles(srcDir, targetDir, { ...options, chokidarWatchOptions }));
                return;
            }
        } catch(err) {
            onError(err);
        }

        resolve();
    });
};

module.exports = synced;
module.exports.sync = synced;
module.exports.async = asynced;
