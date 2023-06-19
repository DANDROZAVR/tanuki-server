import fs from 'fs'
import path from 'path'
import {exec} from "child_process";
export function ensureDirectoryExistence(filePath : string) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

export function makeDirectory(path : string) {
    ensureDirectoryExistence(path);
    fs.mkdirSync(path);
}
export const saveJSToPath = (path: string, code: string) : Promise<boolean> => {
    return new Promise((resolve, reject) => {
        fs.unlink(path, () => {
            ensureDirectoryExistence(path)
            fs.writeFile(path, code, {flag: 'wx'}, (err) => {
                if (err) {
                    console.error(err);
                    reject(err)
                } else {
                    console.log('File has been written.');
                    resolve(true)
                }
            })
        })
    })

}

const compilerPathTnkJson = process.platform === 'linux' ? './tnk2json' : 'tnk2json.exe';
const compilerPathJsonJs = process.platform === 'linux' ? './json2js' : 'json2js.exe';

const compilingFunction = async (compilerPath: string, pathToScript: string, outputPath: string) => {
    await new Promise((resolve, reject) => {
        exec(`${compilerPath} ${pathToScript} > ${outputPath}`, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(undefined);
            }
        });
    });
}

export const compileTnkJson = async (pathToScript: string, outputPath: string) => {
    console.log(`Compiling ${pathToScript} from tnk to JSON`);
    await compilingFunction(compilerPathTnkJson, pathToScript, outputPath)
    console.log("Compiled")
}

export const compileJsonJs = async (pathToScript: string, outputPath: string) => {
    console.log(`Compiling ${pathToScript} from JSON to JS`);
    await compilingFunction(compilerPathJsonJs, pathToScript, outputPath)
    console.log("Compiled")
}