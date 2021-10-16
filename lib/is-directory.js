const fs = require('fs');

module.exports = (filePath) => {
    let isDirectory = false;
    if (fs.existsSync(filePath)) {
        try {
            isDirectory = fs.statSync(filePath).isDirectory();
        } catch(err) {
            console.log(err)
        }
    }

    return isDirectory;
};