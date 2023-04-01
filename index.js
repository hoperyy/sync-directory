const syncLocalFiles = require('./lib/local-syncfiles');
const watchLocalFiles = require('./lib/local-watch');
const matchUtil = require('./lib/match-util');
const isAbsoluteUrl = require('is-absolute');
const path = require('path');
const fs = require('fs');

const formatParams = (srcDir, targetDir, customOptions = {}) => {
    // format srcDir and targetDir to absolute path
    if (!srcDir) {
        throw new Error(`[sync-directory] source path is missing`);
    }

    if (!targetDir) {
        throw new Error(`[sync-directory] target path is missing`);
    }

    const cwd = customOptions.cwd || process.cwd(); // prefer customed cwd
    if (!isAbsoluteUrl(srcDir)) {
        srcDir = path.join(cwd, srcDir);
    }
    if (!isAbsoluteUrl(targetDir)) {
        targetDir = path.join(cwd, targetDir);
    }
    if (!fs.existsSync(srcDir)) {
        throw new Error(`[sync-directory] "srcDir" folder does not exist: "${srcDir}"`);
    }

    const options = { 
        type: 'copy',
        skipInitialSync: false,
        stayHardlink: true,
        watch: false,
        deleteOrphaned: false,
        staySymlink: false,
        chokidarWatchOptions: {},
        include: null,
        exclude: null,
        forceSync: null,
        nodeep: false,
        afterEachSync: () => {},
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
module.exports.formatParams = formatParams;