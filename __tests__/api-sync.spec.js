const mockfs = require('mock-fs')
const fs = require('fs');
const path = require('path');
const syncDirectory = require('../index')

const testDir = path.resolve(__dirname, 'virtfs')
const srcDir = path.join(testDir, 'srcDir');
const targetDir = path.join(testDir, 'targetDir');

const virtfs={
[testDir]: {
  'srcDir': {
    '1.bin': Buffer.from([8, 6, 7, 5, 3, 0, 9]),
    '1.txt': 'new',
    'dir1': {
      '3.txt': 'text'
    },
  },
  'targetDir': {
    '1.txt': 'old',
    '2.txt': 'text',
    'dir2': {},
  }
}
}

describe('api-sync',()=>{

beforeEach(()=>{
mockfs({
...virtfs
},{createCwd:false})
})

test('copy deleteOrphaned',()=>{
syncDirectory.sync(srcDir, targetDir, {
  deleteOrphaned: true,
})
expect(fs.readdirSync(targetDir)).toEqual(['1.bin','1.txt','dir1'])
})

test('copy exclude:file',()=>{
syncDirectory.sync(srcDir, targetDir, {
  deleteOrphaned: false,
  exclude: '.bin',
})
expect(fs.readdirSync(targetDir)).toEqual(['1.txt','2.txt','dir1','dir2'])
})

test('copy exclude:dir',()=>{
syncDirectory.sync(srcDir, targetDir, {
  deleteOrphaned: false,
  exclude: 'dir1',
})
expect(fs.readdirSync(targetDir)).toEqual(['1.bin','1.txt','2.txt','dir2'])
})

test('copy exclude forceSync',()=>{
syncDirectory.sync(srcDir, targetDir, {
  deleteOrphaned: false,
  exclude: 'dir1',
  forceSync: '3',
})
expect(fs.readdirSync(targetDir)).toEqual(['1.bin','1.txt','2.txt','dir1','dir2'])
expect(fs.readdirSync(targetDir+'/dir1')).toEqual(['3.txt'])
})

afterEach(()=>{
mockfs.restore()
})

})
