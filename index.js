const syncLocalFiles = require('./lib/local-syncfiles');
const watchLocalFiles = require('./lib/local-watch');
const isAbsoluteUrl = require('is-absolute');

const synced = (
    srcDir, 
    targetDir, 
    { 
        type = 'copy',
        stayHardlink = false,
        exclude = null,
        watch = false,
        deleteOrphaned = false,
        supportSymlink = false,
        chokidarWatchOptions = {},
        promised = false,
        forceSync = () => {},
        afterEachSync = () => {},
        filter = () => true,
        onError = (err) => { throw new Error(err.message) }
    } = {}
) => {
    try {
        afterSync = afterEachSync;
        const options = { type, stayHardlink, exclude, forceSync, afterSync, deleteOrphaned, supportSymlink, filter, onError, promised };

        // check absolute path
        if (!isAbsoluteUrl(srcDir) || !isAbsoluteUrl(targetDir)) {
            onError({ message: '[sync-directory] "srcDir/targetDir" must be absolute path.' });
            return;
        }

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
        type = 'copy',
        stayHardlink = false,
        exclude = null,
        watch = false,
        deleteOrphaned = true,
        supportSymlink = false,
        chokidarWatchOptions = {},
        promised = false,
        forceSync = () => {},
        afterEachSync = () => {},
        filter = () => true,
        onError = (err) => { throw new Error(err.message) }
    } = {}
) => {
    return new Promise(async (resolve, reject) => {
        try {
            afterSync = afterEachSync;
            const options = { type, stayHardlink, exclude, forceSync, afterSync, deleteOrphaned, supportSymlink, filter, onError, promised };

            // check absolute path
            if (!isAbsoluteUrl(srcDir) || !isAbsoluteUrl(targetDir)) {
                onError({ message: '[sync-directory] "srcDir/targetDir" must be absolute path.' });
                resolve(); // never throw error
                return;
            }

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
