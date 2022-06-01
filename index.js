const syncLocalFiles = require('./lib/local-syncfiles');
const watchLocalFiles = require('./lib/local-watch');
const matchUtil = require('./lib/match-util');
const isAbsoluteUrl = require('is-absolute');

const formatParams = (srcDir, targetDir, customOptions) => {
    const options = { 
        type: 'copy',
        skipInitialSync: false,
        stayHardlink: true,
        watch: false,
        deleteOrphaned: false,
        sSymlink: false,
        chokidarWatchOptions: {},
        afterEachSync: () => {},
        include: null,
        exclude: null,
        forceSync: null,
        deep: true,
        onError: (err) => {
            const e = new Error(err.message);
            e.stack = err.stack;
            throw e;
        }
    };

    Object.assign(options, customOptions);

    // priot: 1
    options.include = options.include === null ? () => true : matchUtil.toFunction(options.include);
    // priot: 2
    options.exclude = options.exclude === null ? () => false : matchUtil.toFunction(options.exclude);
    // priot: 3
    options.forceSync = options.forceSync === null ? () => false : matchUtil.toFunction(options.forceSync);

    options.afterSync = options.afterEachSync;

    // check absolute path
    if (!isAbsoluteUrl(srcDir) || !isAbsoluteUrl(targetDir)) {
        options.onError({ message: '[sync-directory] "srcDir/targetDir" must be absolute path.' });
        return null;
    }

    return { srcDir, targetDir, options };
};

const synced = (...args) => {
    const params = formatParams(...args);

    if (params) {
        const { srcDir, targetDir, options } = params;

        if (!options.skipInitialSync) {
            syncLocalFiles.sync(srcDir, targetDir, options);
        }

        if (options.watch) {
            return watchLocalFiles(srcDir, targetDir, options);
        }
    }
};

const asynced = async (...args) => {
    const params = formatParams(...args);

    if (params) {
        const { srcDir, targetDir, options } = params;

        if (!options.skipInitialSync) {
            await syncLocalFiles.async(srcDir, targetDir, options);
        }

        if (options.watch) {
            return watchLocalFiles(srcDir, targetDir, options);
        }
    }
};

module.exports = synced;
module.exports.sync = synced;
module.exports.async = asynced;
