import path from 'path'
import fs from 'fs'
const clearModule = require('clear-module');

export const loadJSFromPath = (path: string) : any => {
    clearModule(path)
    module = require(path)
    return module
}

export const loadFileFromPath = (path: string) : any => {
    const source = fs.readFileSync(path, 'utf-8')
    return source
}
