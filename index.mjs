import * as output from './index.js'
const { sync, async, formatParams } = output

console.log('from esm')

export default output
export {
    sync,
    async,
    formatParams
}
