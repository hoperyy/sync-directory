const syncLocalFiles = require('./lib/local-syncfiles');
const watchLocalFiles = require('./lib/local-watch');

module.exports = (srcDir, targetDir, { type = 'hardlink', exclude = null, watch = false } = {}) => {
    syncLocalFiles(srcDir, targetDir, { type, exclude });

    if (watch) {
        const watcher = watchLocalFiles(srcDir, targetDir, { type, exclude });
        return watcher;
    }

};
