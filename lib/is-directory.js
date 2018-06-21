const fs = require('fs');

module.exports = (filePath) => {
    let isDirectory = false;
    if (fs.existsSync(filePath)) {
        isDirectory = fs.statSync(filePath).isDirectory();
    }

    return isDirectory;
};