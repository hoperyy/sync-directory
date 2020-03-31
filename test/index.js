const path = require('path');
const fs = require('fs');

const syncDirectory = require('../index');

const srcDir = path.join(__dirname, 'srcDir');
const targetDir = path.join(__dirname, 'targetDir');

syncDirectory(srcDir, targetDir, {
    watch: true,
    deleteOrphaned: true,
    exclude: [ 'c.js' ],
    forceSync(file) {
        return /c\.js/.test(file)
    },
    afterSync({ type, relativePath }) {
        console.log('type: ', type);
        console.log('path: ', relativePath);
    },
    // onError(e) {
    //     console.log('in onError: ', e);
    // }
});