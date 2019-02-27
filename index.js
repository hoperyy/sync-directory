const syncLocalFiles = require('./lib/local-syncfiles');
const watchLocalFiles = require('./lib/local-watch');

module.exports = (srcDir, targetDir, { type = 'hardlink', exclude = null, watch = false, deleteOrphaned = true, cb = () => { }, afterSync = () => {}, filter = () => true } = {}) => {
    syncLocalFiles(srcDir, targetDir, { type, exclude, afterSync, deleteOrphaned, filter });

    if (watch) {
		const watcher = watchLocalFiles(srcDir, targetDir, { type, exclude, cb, afterSync, deleteOrphaned, filter });
        return watcher;
    }

};
