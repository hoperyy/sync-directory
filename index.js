const syncLocalFiles = require('./lib/local-syncfiles');
const watchLocalFiles = require('./lib/local-watch');

module.exports = (srcDir, targetDir, { type = 'hardlink', ignored = null } = {}) => {
    syncLocalFiles(srcDir, targetDir, { type, ignored });
    const watcher = watchLocalFiles(srcDir, targetDir, { type, ignored });
    return watcher;
};
