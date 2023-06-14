import {
    deletePathOrScriptByName,
    dirInfo,
    getPathByID,
    getPathByName,
    getPathByParent,
    getUserByName, getUserSettingsByUserName,
    insertIntoCalendar,
    insertIntoSchedule,
    insertPathByName,
    insertUser,
    Path,
    updatePathByName,
    updateScheduleOptionsByID,
    updateUserSettings
} from "./sql/database"
import {makeDirectory, saveJSToPath} from "./helpers/scriptsDymSaving"
import {createWorker} from "./workersManager"
import * as crypto from "crypto"
import {deleteDirectory, deleteFromPath} from "./helpers/scriptsDymDeleting"
import {loadFileFromPath} from "./helpers/scriptsDymLoading"

/**
 *
 * @param bodyJson
 * Example:
 *  {
 *      user: "admin",
 *      title: "title",
 *      source: "source",
 *  }
 */

interface Script {
    title: string
    source: string
}

const MAX_TIMES_EXECUTION = 1000

export class DataError extends Error {}

const checkContainsTags = (bodyJson: any, tags: string[]) : boolean => {
    for (const word of tags)
        if (!(word in bodyJson))
            return false
    return true
}

const createScriptPath = (currentDir: string, title: string, pureJSCode: boolean) => {
    return `scripts/${currentDir}${title}${pureJSCode ? '.js' : '.tnk'}`
}

export const getScriptPath = (path: string, pureJSCode: boolean) => {
    return "scripts/" + path + (pureJSCode ? '.js' : '.tnk')
}

export const parseInsert = async (bodyJson: any) : Promise<void> => {
    await parseAuthenticate(bodyJson)
    if (!checkContainsTags(bodyJson, ['user', 'title', 'source', 'description', 'currentDir'])) {
        throw new DataError('not a valid insert request')
    }
    const { title, user, source, description, currentDir, pureJSCode = false } = bodyJson
    const path = createScriptPath(currentDir, title, pureJSCode)
    await insertPathByName(title, description, user, currentDir, false, pureJSCode)
        .then(() => saveJSToPath(path, source))
        .catch((error) => {
            if (error.errno == 19) {
                throw new DataError("Script with that name already exists")
            } else {
                throw error
            }
        })
}

export const parseCreateDirectory = async (bodyJson: any): Promise<void> => {
    await parseAuthenticate(bodyJson)
    if (!checkContainsTags(bodyJson, ['user', 'name', 'currentDir', 'description'])) {
        throw new DataError('not a valid insert request')
    }
    const { name, user, currentDir, description } = bodyJson
    const path = `scripts/${currentDir}${name}/`
    await insertPathByName(name, description, user, currentDir, true, false)
        .then(() => makeDirectory(path))
        .catch((error) => {
            if (error.errno == 19) {
                throw new DataError("Directory with that name already exists")
            } else {
                throw error
            }
        })
}

export const parseUpdate = async (bodyJson: any) : Promise<string> => {
    await parseAuthenticate(bodyJson)
    if (!checkContainsTags(bodyJson, ['user', 'path', 'description', 'source'])) {
        throw new DataError('not a valid update request')
    }
    const { user, path, description, source } = bodyJson
    const script: Path = await getPathByName(path, user)
    if (script === undefined || script.isDirectory) {
        throw new DataError("Script with that name does not exist")
    }
    await updatePathByName(description, script.path, user)
        .then(_ => saveJSToPath(getScriptPath(script.path, script.pureJSCode), source))
        .catch(error =>{
            console.log(error)
                throw error
        })
    return script.title
}

export const parseDelete = async (bodyJson: any) : Promise<string> => {
    await parseAuthenticate(bodyJson)
    if (!checkContainsTags(bodyJson, ['user', 'path']))
        throw new DataError('not a valid delete request')

    const { user } = bodyJson
    const path : Path = await getPathByName(bodyJson.path, user)
    if(path === undefined) {
        throw new DataError("Script with that name does not exist")
    }

    if (!path.isDirectory) {
        // is a script
        await deletePathOrScriptByName(path.path, user)
            .then(_ => deleteFromPath(getScriptPath(path.path, path.pureJSCode)))
            .catch(error => {
                console.log(error)
                throw error
            })
    } else {
        const subdirs = await getPathByParent(path.id)
        if (subdirs.length > 0) {
            throw new DataError("Directory is not empty")
        }
        await deletePathOrScriptByName(path.path, user)
            .then(_ => deleteDirectory("scripts/" + path.path))
            .catch(error => {
                console.log(error)
                throw error
            })
    }
    return path.title
}

export const parseExecute = async (bodyJson: any) : Promise<string> => {
    await parseAuthenticate(bodyJson)
    if (!checkContainsTags(bodyJson, ['user', 'path']))
        throw new DataError('not a valid execute request bro')
    const { path, user } = bodyJson
    const script = await getPathByName(path, user)
    if (script === undefined || script.isDirectory) {
        throw new DataError("Script with that name does not exist")
    }
    script.path = getScriptPath(script.path, script.pureJSCode)
    const userSettings = await getUserSettingsByUserName(bodyJson.user)
    createWorker({
        workerData: {
            script: script,
            scriptOptions: bodyJson.scriptOptions
        }
    }, userSettings)
    return script.title
}

export const parseLoadScript = async (bodyJson: any) : Promise<Script> => {
    await parseAuthenticate(bodyJson)
    if (!checkContainsTags(bodyJson, ['user', 'path']))
        throw new DataError('not a valid load request')
    const { path, user } = bodyJson
    const script : Path = await getPathByName(path, user)
    if (script === undefined || script.isDirectory) {
        throw new DataError("Script with that name does not exist")
    }
    const source = loadFileFromPath(getScriptPath(script.path, script.pureJSCode)) // TODO: is this script.path same as path? fixt it then!
    return {title: script.title, source}
}

export const parseLoadDirectory = async (bodyJson: any) : Promise<dirInfo[]> => {
    await parseAuthenticate(bodyJson)
    if (!checkContainsTags(bodyJson, ['user', 'path']))
        throw new DataError('not a valid load request')
    const { path, user } = bodyJson
    const directory : Path = await getPathByName(path, user)
    if (directory === undefined || !directory.isDirectory) {
        throw new DataError("Directory with that name does not exist")
    }
    return getPathByParent(directory.id)
}

export const getParentDirectory = async (bodyJson: any) : Promise<string> => {
    await parseAuthenticate(bodyJson)
    if (!checkContainsTags(bodyJson, ['user', 'path']))
        throw new DataError('not a valid load request')
    const { path, user } = bodyJson
    const directory : Path = await getPathByName(path, user)
    if (directory === undefined || !directory.isDirectory) {
        throw new DataError("Directory with that name does not exist")
    }
    if (directory.parent == -1) {
        return directory.path
    }
    return (await getPathByID(directory.parent)).path
}

export const parseSchedule = async (bodyJson: any) : Promise<Date> => {
    await parseAuthenticate(bodyJson)
    if (!checkContainsTags(bodyJson, ['user', 'path', 'scheduleOptions']))
        throw new DataError('not a valid schedule request')
    const options = bodyJson.scheduleOptions
    if (!checkContainsTags(options, ['tag']))
        throw new DataError('not a valid schedule request')
    const { path, user } = bodyJson
    const script : Path = await getPathByName(path, user)
    if (script === undefined || script.isDirectory) {
        throw new DataError("Script with that name does not exist")
    }
    return addToCalendar(script, options)
}

export const addToCalendar = async (script: any, options: any, firstTime: boolean = true, scheduleID: number = -1) : Promise<Date> => {
    const tag = options.tag
    if (!(tag == 'once' || tag == 'every' || tag == 'times'))
        throw new DataError('not a valid schedule request')

    let date : Date
    if (tag == 'once') {
        if (!firstTime) throw new DataError('entering to once section not for the first time')
        if (!checkContainsTags(options, ['once'])) throw new DataError('not a valid schedule request')
        const onceOptions = options.once
        if (!checkContainsTags(onceOptions, ['date'])) throw new DataError('not a valid schedule request')
        date = onceOptions.date
    } else
    if (tag == 'every') {
        throw new DataError('not a valid schedule request')
    } else
    if (tag == 'times') {
        if (!checkContainsTags(options, ['times'])) throw new DataError('not a valid schedule request')
        const timesOptions = options.times
        if (!checkContainsTags(timesOptions, ['timesExecution', 'minWaitMinute', 'maxWaitMinute']) || timesOptions.timesExecution <= 0 || timesOptions.timesExecution > MAX_TIMES_EXECUTION) throw new DataError('not a valid schedule request')
        const minutesToWait = getRandomNumber(timesOptions.minWaitMinute, timesOptions.maxWaitMinute)
        date = new Date(Date.now() + minutesToWait * 60 * 1000)
        timesOptions.timesExecution -= 1
    } else throw new DataError('not a valid schedule request')

    if (firstTime) {
        scheduleID = await insertIntoSchedule(script.id, options)
    } else {
        await updateScheduleOptionsByID(scheduleID, options)
    }

    await insertIntoCalendar(scheduleID, date)
    console.log(`script added: ${script.title} ${date}`)
    return new Date(date)
}

export const parseCreateUser = async (bodyJson: any) : Promise<void> => {
    if (!checkContainsTags(bodyJson, ['user', 'password']))
        throw new DataError('not a valid create user request')
    const { user, password } = bodyJson
    await createUser(user, password)
        .then(_ => parseCreateDirectory({
            user,
            password,
            currentDir: "",
            name: user,
            description: "home directory for user " + user
        }))
}

export const parseUpdateUserSettings = async (bodyJson: any) : Promise<string> => {
    await parseAuthenticate(bodyJson)
    const settingsAvailable = ['retryScriptOnFailDefault', 'maxScriptsRunningSameTime']
    let response = ''
    for (const setting of settingsAvailable) {
        if (bodyJson[setting] && typeof bodyJson[setting] === 'number') {
            await updateUserSettings(bodyJson.user, setting, bodyJson[setting])
            if (response.length)
                response += ' & '
            response += `update '${setting}' to ${bodyJson[setting]}`
        }
    }
    if (!response.length) {
        response = 'Nothing was mentioned to update in user settings'
    }
    return response
}

export const parseAuthenticate = async (bodyJson: any) : Promise<void> => {
    if (!checkContainsTags(bodyJson, ['user', 'password']))
        throw new DataError('request is lacking credentials')
    const { user, password } = bodyJson
    if(!await authenticateUser(user, password))
        throw new DataError('incorrect password')
}

function getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export const createUser = async(username:string, password:string) => {
    return new Promise<void>((resolve, reject) => {
        const salt = crypto.randomBytes(32)
        let hash:Buffer
        crypto.pbkdf2(password, salt, 1024, 64, 'sha256', async (err, derivedKey) => {
            if (err) {
                throw new DataError('error encrypting users password')
            } else {
                hash = derivedKey
                await insertUser(username, salt.toString('hex'), hash.toString('hex')).catch(error => {
                    if (error.errno == 19) {
                        reject("User with that name already exist")
                    } else {
                        reject(error)
                    }
                })
                resolve()
            }
        })
    })
}


export const authenticateUser = async(username:string, password:string) : Promise<boolean> => {
    const user = await getUserByName(username)
    if(user===undefined){
        throw new DataError('user with that name does not exist')
    }
    const salt:Buffer = Buffer.from(user.salt, "hex")
    return await new Promise((resolve) => {
        crypto.pbkdf2(password, salt, 1024, 64, 'sha256', (err, derivedKey) => {
            if (err) throw new DataError('error encrypting users password')
            else {
                resolve(derivedKey.toString("hex") == user.hash)
            }
        })
    })
}
