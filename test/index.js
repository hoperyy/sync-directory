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
    // fse.removeSync(targetDir);
}

// fse.ensureSymlinkSync(srcSymlink, toSymlink);

const delay = () => new Promise(r => setTimeout(r, 200))

syncDirectory.sync(srcDir, targetDir, {
    watch: true,
    // type: 'hardlink',
    deleteOrphaned: true,
    // nodeep: true,
    // skipInitialSync: true,
    // supportSymlink: true,
    // stayHardlink: false,
    // include: [ '/c' ],
    // exclude: [ '/d' ],
    // forceSync: [ '/d' ],
    // forceSync(file) {
    //     // return /b/.test(file);
    // },
    async afterEachSync({ eventType, relativePath, srcPath, targetPath, nodeType }) {
        // console.log({ eventType, relativePath, srcPath, targetPath, nodeType });
        console.log(eventType, nodeType, targetPath);
        await delay();
    },
    // chokidarWatchOptions: {
    //     awaitWriteFinish: {
    //         stabilityThreshold: 2000,
    //         pollInterval: 100
    //     }
    // },
    // onError(e) {
    //     console.log('in onError: ', e);
    // }
});