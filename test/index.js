const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');

const syncDirectory = require('../index');

const srcDir = path.join(__dirname, 'srcDir');
const targetDir = path.join(__dirname, 'targetDir');
const srcSymlink = path.join(__dirname, 'symlink');
const toSymlink = path.join(__dirname, 'srcDir/symlink');

if (fs.existsSync(toSymlink)) {
    fse.removeSync(toSymlink);
}

if (fs.existsSync(targetDir)) {
    fse.removeSync(targetDir);
}

fse.ensureSymlinkSync(srcSymlink, toSymlink);

syncDirectory(srcDir, targetDir, {
    watch: true,
    type: 'copy',
    deleteOrphaned: true,
    supportSymlink: true,
    exclude: [ 'c.js' ],
    forceSync(file) {
        return /c\.js/.test(file)
    },
    afterSync({ type, relativePath }) {
        // console.log(type, relativePath);
    },
    // onError(e) {
    //     console.log('in onError: ', e);
    // }
});