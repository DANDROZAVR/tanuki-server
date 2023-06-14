import {loadJSFromPath} from "./helpers/scriptsDymLoading";
import { exec } from "child_process";

const { isMainThread, workerData, parentPort } = require('node:worker_threads');
// path to compiler (should be in top folder) - make sure you have binary for your platform
const compilerPath = process.platform === 'linux' ? './compile' : 'compile.exe';

const waitForConfirmationFromMainThread = async () => {
    let messagePromise = new Promise(resolve => {
        parentPort?.on("message", (message: any) => {
            if (message == 'ok')
                resolve(undefined)
            return;
        })
    });
    await messagePromise
    parentPort?.close()
}

const compileScript = async (pathToScript: string, outputPath: string) => {
    console.log(`Compiling ${pathToScript}`);
    await new Promise((resolve, reject) => {
        exec(`${compilerPath} < ${pathToScript} > ${outputPath}`, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(undefined);
            }
        });
    });
}

const asyncMainFunction = async () => {
    const pathToScript : string = workerData.script.path
    let pathToJS
    if (!workerData.script.pureJSCode) {
        pathToJS = pathToScript.slice(0, -4) + '-compiled.js'
        await compileScript(pathToScript, pathToJS)
    } else {
        pathToJS = 'scripts/' + pathToScript + '.js' // TODO: wtf. why should I add script prefix here?
    }
    const module = loadJSFromPath('../../' + pathToJS)
    let response = await module.start(workerData.lastRunFeedback, workerData.scriptOptions)
    if (response === undefined)
        response = {}
    response['type'] = 'feedbackWorker'
    parentPort?.postMessage(response)
    await waitForConfirmationFromMainThread()
};

if (isMainThread) {
    console.log("You are not allowed to enter here. Get out!")
} else {
    asyncMainFunction()
}
