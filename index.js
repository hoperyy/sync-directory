const syncLocalFiles = require('./lib/local-syncfiles');
const watchLocalFiles = require('./lib/local-watch');

module.exports = (srcDir, targetDir, { type = 'hardlink', exclude = null, watch = false, cb = () => { }, afterSync = () => {} } = {}) => {
    syncLocalFiles(srcDir, targetDir, { type, exclude, afterSync });

    if (watch) {
        const watcher = watchLocalFiles(srcDir, targetDir, { type, exclude, cb, afterSync });
        return watcher;
    }

};
