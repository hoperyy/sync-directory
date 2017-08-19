const syncLocalFiles = require('./lib/local-syncfiles');
const watchLocalFiles = require('./lib/local-watch');

module.exports = (srcDir, targetDir, { type = 'hardlink', ignored = null, watch = false } = {}) => {
    syncLocalFiles(srcDir, targetDir, { type, ignored });

    if (watch) {
        const watcher = watchLocalFiles(srcDir, targetDir, { type, ignored });
        return watcher;
    }

};
