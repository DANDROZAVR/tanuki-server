import {loadJSFromPath} from "./helpers/scriptsDymLoading";
import {compileJsonJs} from "./helpers/scriptsDymSaving";

const { isMainThread, workerData, parentPort } = require('node:worker_threads');
// path to compiler (should be in top folder) - make sure you have binary for your platform

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

const asyncMainFunction = async () => {
    const pathToScript : string = workerData.script.path
    let pathToJS
    if (!workerData.script.pureJSCode) {
        pathToJS = pathToScript.slice(0, -5) + '-compiled.js'
        await compileJsonJs(pathToScript, pathToJS)
    } else {
        pathToJS = pathToScript
    }
    const module = loadJSFromPath('../../' + pathToJS)
    let response = await module.start(workerData.lastRunFeedback, workerData.scriptOptions)
    const message = {content: response, type: 'feedbackWorker'}
    parentPort?.postMessage(message)
    await waitForConfirmationFromMainThread()
};

if (isMainThread) {
    console.log("You are not allowed to enter here. Get out!")
} else {
    asyncMainFunction()
}
