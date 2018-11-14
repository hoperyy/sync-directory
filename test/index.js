const path = require('path');
const fs = require('fs');

const syncDirectory = require('../index');

const srcDir = path.join(__dirname, 'srcDir');
const targetDir = path.join(__dirname, 'targetDir');

syncDirectory(srcDir, targetDir, {
    deleteOrphaned: true,
    watch: true
});