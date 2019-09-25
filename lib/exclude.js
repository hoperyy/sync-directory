module.exports = {

    _isArray(o) {
        if (Object.prototype.toString.call(o)=='[object Array]') {
            return true;
        }

        return false;
    },

    _testStringOrRegExp(relativeFilePath, exclude) {
        if (typeof exclude === 'string') {
            if (relativeFilePath.indexOf(exclude) !== -1) {
                return true;
            }
        } else if (Object.prototype.toString.call(exclude)=='[object RegExp]') {
            if (exclude.test(relativeFilePath)) {
                return true;
            }
        } else if (Object.prototype.toString.call(exclude) == '[object Function]') {
            if (exclude(relativeFilePath)) {
                return true;
            }
        }

        return false;
    },

    test(relativeFilePath, exclude) {
        if (!exclude) {
            return false;
        }

        if (this._testStringOrRegExp(relativeFilePath, exclude)) {
            return true;
        }

        if (Object.prototype.toString.call(exclude)=='[object Array]') {
            for (let i = 0; i < exclude.length; i++) {
                if (this._testStringOrRegExp(relativeFilePath, exclude[i])) {
                    return true;
                }
            }
        }

        return false;
    }
};
