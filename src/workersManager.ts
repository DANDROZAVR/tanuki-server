import {Worker} from "node:worker_threads";
import {ensureDirectoryExistence} from "./helpers/scriptsDymSaving";
import { UserSettings } from "./sql/database";
const fs = require('fs')
const Console = console.Console

const logs_errors = './utils/logs_errors.txt'
ensureDirectoryExistence(logs_errors)
const output = fs.createWriteStream(logs_errors)
const errors = new Console(output)

let workersInWork : [Worker, any, number, any, UserSettings][] = []
let workersWaiting : [string, any, number, any, UserSettings][] = []
const tasksPerUserRunning = {}

// TODO: do refactor to change this array to JSON
setInterval(() => {
    console.log(tasksPerUserRunning)
    for (let i = workersInWork.length - 1; i >= 0; --i) {
        let toBeRemoved = false, ended = false
        const [, workerOptions, exitCode, , userSettings] = workersInWork[i]
        if (workersInWork[i][2] == 1) {
            // naturally finished
            console.log('normally finished task "' + workerOptions.workerData.script.title + '"')
            toBeRemoved = true
            ended = true
        } else
        if (workersInWork[i][2] > 1) {
            // finished with an error. was runned x - 1 time (initially 2 means an error)
            if (exitCode <= userSettings.retryScriptOnFailDefault) {
                console.log('retrying task "' + workerOptions.workerData.script.title + '"')
                createWorker(workerOptions, userSettings, workerOptions.callback, -exitCode)
            } else {
                const error = `task "${workerOptions.workerData.script.title}" failed ${userSettings.retryScriptOnFailDefault} times`
                console.log(error)
                errors.log(error)
                ended = true
            }
            toBeRemoved = true
        } else {
            // 0 --- normally executing
        }
        if (ended) {
            if (workerOptions['callback']) {
                console.log('well we have:')
                console.log(workersInWork[i].length)
                console.log(workersInWork[i][3])
                console.log(workerOptions.workerData.lastRunFeedback)
                if (workersInWork[i].length >= 3 && workersInWork[i][3] !== undefined) {
                    workerOptions.callback(workersInWork[i][3])
                } else {
                    workerOptions.callback(workerOptions.workerData.lastRunFeedback)
                }
            }
        }
        if (toBeRemoved) {
            // @ts-ignore
            tasksPerUserRunning[userSettings.userID] -= 1
            workersInWork.splice(i, 1);
        }
    }
    if (workersInWork.length <= 0 && workersWaiting.length) { // change
        // @ts-ignore
        const workerInfo : [string, any, number, any, userSettings] = workersWaiting.shift()
        console.log(workersWaiting.length)
        // some problems wih adding workers?
        const worker = new Worker(workerInfo[0], workerInfo[1])
        console.log("worker created for task: " + workerInfo[1].workerData.script.title)
        // @ts-ignore
        tasksPerUserRunning[workerInfo[4].userID] += 1
        workersInWork.push([worker, workerInfo[1], workerInfo[2], workerInfo[3], workerInfo[4]])
        enableLogs(worker)
    }
}, 1000)
// TODO: make interfaces for each call in database like WorkerOptions

export const runWorker = (workerOptions: any, userSettings: UserSettings) : Promise<any> => {
    return new Promise((resolve) => {
        createWorker(workerOptions, userSettings, (feedback: any) => {
            resolve(feedback)
            return
        })
    })
}

export const createWorker = (workerOptions: any, userSettings: UserSettings, callback: any = undefined, exitCode: number = 0)  => {
    console.log(userSettings)
    if (callback != undefined) {
        workerOptions['callback'] = callback
    }
    if (!(userSettings.userID in tasksPerUserRunning)) { // @ts-ignore
        tasksPerUserRunning[userSettings.userID] = 0
    }
    const workerPath = './build/worker.js'
    workersWaiting.push([workerPath, workerOptions, exitCode, undefined, userSettings])
    console.log('added task "' + workerOptions.workerData.script.title + '"')
}

const findWorker = (worker: Worker) : number => {
    for (let i = 0; i < workersInWork.length; ++i)
        if (workersInWork[i][0] === worker)
            return i
    console.error("Worker wasn't found in the list. Something bad have happened")
    return -1;
}

const enableLogs = (worker: Worker) => {
    worker.on('message', (message) => {
        if (message.type == 'feedbackWorker') {
            const index = findWorker(worker)
            workersInWork[index][3] = message
            worker.postMessage('ok')
        }
    });
    worker.on('error', (error) => {
        console.error(`Worker error: ${error.message}`);
        // Start a new task once the worker is no longer busy
    });
    worker.on('exit', (code) => {
        const index = findWorker(worker)
        if (index !== -1) {
            // TODO: do this callback is executing in the main thread? there won't be any problems with?
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
                if (!workersInWork[index][2]) {
                    workersInWork[index][2] = -1;
                }``
            } else {
                console.log('worker stopped normally')
                workersInWork[index][2] = 0; // means we exited with 0 code, and we don't want longer to retry
            }
            workersInWork[index][2] = -workersInWork[index][2] + 1
        }
    });
}
