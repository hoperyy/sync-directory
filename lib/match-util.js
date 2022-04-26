module.exports = {
    _testOneCase(relativeFilePath, matchDesc) {
        const type = Object.prototype.toString.call(matchDesc);

        // [object String]
        if (type === '[object String]') {
            if (relativeFilePath.indexOf(matchDesc) !== -1) {
                return true;
            }
        } else if (type =='[object RegExp]') {
            if (matchDesc.test(relativeFilePath)) {
                return true;
            }
        } else if (type == '[object Function]') {
            if (matchDesc(relativeFilePath)) {
                return true;
            }
        }

        return false;
    },

    test(relativeFilePath, matchDesc) {
        const type = Object.prototype.toString.call(matchDesc);

        switch(type) {
            case '[object Array]':
                for (let i = 0; i < matchDesc.length; i++) {
                    if (this._testOneCase(relativeFilePath, matchDesc[i])) {
                        return true;
                    }
                }
                break;
            default:
                return this._testOneCase(relativeFilePath, matchDesc);
        }
    },

    toFunction(matchDesc) {
        const type = Object.prototype.toString.call(matchDesc);

        return (filePath) => {
            return this.test(filePath, matchDesc);
        };
    }
};
