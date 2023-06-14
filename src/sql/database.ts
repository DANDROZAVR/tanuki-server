import { Database } from 'sqlite3'
import fs from 'fs'
export interface User {
    id: number
    name: string
    salt: string
    hash: string
}

export interface UserSettings {
    id: number
    userID: number
    retryScriptOnFailDefault: number
    maxScriptsRunningSimultaneously: number
}

export interface Path {
    id: number
    path: string
    title: string
    description: string
    parent: Path['id']
    isDirectory: boolean
    pureJSCode: boolean
    user: User['id']
}

export interface dirInfo{
    name: string,
    description: string,
    isDirectory: boolean
}

interface Schedule {
    id: number
    options: ScheduleOptions,
    scriptID: Path['id'],
}


enum ScheduleTag {
    once,
    every,
    times
}
interface ScheduleOptions {
    tag: ScheduleTag,
    once: OnceOptions | undefined,
    times: NotOnceOptions | undefined,
    lastRunFeedback: any,
    scriptOptions: any,
}

interface OnceOptions {
    date: Date,
}

interface NotOnceOptions {
    timesExecution: number,
    minWaitMinute: number,
    maxWaitMinute: number
}

interface Calendar {
    id: number,
    scheduleID: Schedule['id']
    datetime: Date
}


const db = new Database('tanuki.db')

export function createDB(): void {
    db.exec(fs.readFileSync('src/sql/create.sql').toString())
}

export function insertPathByName(title: string, description: string, userName: string, parent: string, isDir: boolean, pureJSCode: boolean) : Promise<boolean> {
    return new Promise((resolve, reject) => {
        getUserByName(userName)
            .then(async user => resolve(await insertPathByID(title, description, user.id, parent, isDir, pureJSCode)))
            .catch(error => reject(error))
    })
}

export function insertPathByID(title: string, description: string, userID: number, parent: string, isDir: boolean, pureJSCode: boolean): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
        const path = parent + title + (isDir ? '/' : '')
        const parentDir = await getPathByUserID(parent, userID)
        const parentID = parentDir?.id ?? -1
        const insert = db.prepare("INSERT INTO paths (title, description, user, path, parent, isDirectory, pureJSCode) VALUES (?, ?, ?, ?, ?, ?, ?)")
        insert.run([title, description, userID, path, parentID, isDir, pureJSCode], (error) => {
            if (error == null)
                resolve(true); else
                reject(error)
        })
    })
}

export function updatePathByName(description: string, path: string, userName: string) : Promise<boolean> {
    return new Promise((resolve, reject) => {
        getUserByName(userName)
            .then(async user => resolve(await updatePathByID(description, path, user.id)))
            .catch(error => reject(error))
    })
}

export function updatePathByID(description: string, path: string, userID: number): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
        const update = db.prepare("UPDATE paths SET description =? WHERE user = ? AND path = ?")
        update.run([description, userID, path], (error) => {
            if (error == null) // TODO: could be non null but false? if not -- check only with if (error)
                resolve(true); else
                reject(error)
        })
    })
}

export function deletePathOrScriptByName(path: string, userName: string) : Promise<boolean> {
    return new Promise((resolve, reject) => {
        getUserByName(userName)
            .then(async user => resolve(await deletePathByID(path, user.id)))
            .catch(error => reject(error))
    })
}

export function deletePathByID(path: string, userID: number): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
        const update = db.prepare("DELETE FROM paths WHERE user = ? AND path = ?")
        update.run([userID, path], (error) => {
            if (error == null)
                resolve(true); else
                reject(error)
        })
    })
}

export function insertUser(name: string, salt:string, hash:string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
        const insert = db.prepare("INSERT INTO users (name, salt, hash) VALUES (?, ?, ?)")
        insert.run([name, salt, hash], async function (error) {
            if (error == null) {
                const id = this.lastID
                resolve(id)
            } else {
                reject(error)
            }
        })
    })
        .then(userID => {
            return new Promise(async (resolve, reject) => {
                const emptySettingsInsert = db.prepare("INSERT INTO userSettings (userID) VALUES (?)")
                emptySettingsInsert.run([userID], (error) => {
                    if (error == null) {
                        resolve(true)
                    } else {
                        reject(error)
                    }
                })
            })
        })
}

export const insertIntoSchedule = async(scriptID: number, options: any): Promise<number> => {
    return new Promise((resolve, reject) => {
        const insert = db.prepare(
            "INSERT INTO schedule (scriptID, options) VALUES (?, ?)"
        )
        insert.run([scriptID, JSON.stringify(options)], async function (error) {
            if (error == null) {
                const id = this.lastID
                resolve(id)
            } else {
                reject(error)
            }
        })
    })
}


export function insertIntoCalendar(scheduleID: number, datetime: Date): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const insert = db.prepare(
            "INSERT INTO calendar (scheduleID, datetime) VALUES (?, ?)"
        )
        insert.run([scheduleID, datetime], (error) => {
            if (error == null) {
                resolve(true)
            } else {
                reject(error)
            }
        })
    })
}

export function updateScheduleOptionsByID(scheduleID: number, options: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const update = db.prepare(
            "UPDATE schedule SET options = ? WHERE id = ?"
        )
        update.run([JSON.stringify(options), scheduleID], (error) => {
            if (error == null) {
                resolve(true)
            } else {
                reject(error)
            }
        })
    })
}

export const updateUserSettings = async (userName: string, settingsParameter: string, settingsValue: string) => {
    return new Promise((resolve, reject) => {
        getUserByName(userName)
            .then(user => {
                const update = db.prepare(
                    `UPDATE userSettings SET ${settingsParameter} = ? WHERE userID = ?`
                );
                update.run([settingsValue, user.id], (error) => {
                    if (error == null) {
                        resolve(true)
                    } else {
                        reject(error)
                    }
                })
            })
    })
}

export function getPathByName(path: string, userName: string): Promise<Path> {
    return new Promise((resolve, reject) => {
        getUserByName(userName)
            .then(async user => resolve(await getPathByUserID(path, user.id)))
            .catch(error => reject(error))
    })
}


export function getPathByUserID(path: string, user: number): Promise<Path> {
    return new Promise((resolve, reject) => {
        const select = db.prepare(
            "SELECT * FROM paths WHERE paths.path = ? AND paths.user = ?"
        )
        select.get([path, user], (err, row) => {
            if (err) {
                reject(err)
            } else {
                // @ts-ignore
                resolve(row)
            }
        })
    })
}

export function getPathByID(scriptID: number): Promise<Path> {
    return new Promise((resolve, reject) => {
        const select = db.prepare(
            "SELECT * FROM paths WHERE paths.id = ?"
        )
        select.get([scriptID], (err, row) => {
            if (err)
                reject(err)
            else if (row === undefined) {
                reject(`There's no script with id ${scriptID}`)
            } else {
                // @ts-ignore
                resolve(row)
            }
        })
    })
}

export function getPathByParent(parentID: number): Promise<dirInfo[]> {
    return new Promise((resolve, reject) => {
        const select = db.prepare(
            "SELECT title, description, isDirectory FROM paths WHERE paths.parent = ?"
        )
        select.all([parentID], (err, rows) => {
            if (err)
                reject(err)
            else if (rows === undefined) {
                reject(`There's no directory with id ${parentID}`)
            } else {
                // @ts-ignore
                resolve(rows)
            }
        })
    })
}

export function getUserByName(name: string) : Promise<User> {
    return new Promise((resolve, reject) => {
        const selectId = db.prepare("SELECT * FROM users WHERE users.name == ?")
        selectId.get([name], (err, row) => {
            if (err)
                reject(err); else
            if (row === undefined) {
                reject(`There are no users with the name ${name}`)
            } else {
                resolve(row as User)
            }
        })
    })
}

export function getUserByID(id: number) : Promise<User> {
    return new Promise((resolve, reject) => {
        const selectId = db.prepare("SELECT * FROM users WHERE users.id == ?")
        selectId.get([id], (err, row) => {
            if (err)
                reject(err); else
            if (row === undefined) {
                reject(`There are no users with the id ${id}`)
            } else {
                resolve(row as User)
            }
        })
    })
}

export function getUserSettingsByUserName(name: string) : Promise<UserSettings> {
    return new Promise(async (resolve, reject) => {
        const user = await getUserByName(name)
        const selectId = db.prepare("SELECT * FROM userSettings WHERE userID == ?")
        console.log(user.id)
        selectId.get([user.id], (err, row) => {
            if (err) {
                reject(err)
            } else {
                resolve(row as UserSettings)
            }
        })
    })
}

export function getUserSettingsByUserID(id: number) : Promise<UserSettings> {
    return new Promise(async (resolve, reject) => {
        const selectId = db.prepare("SELECT * FROM userSettings WHERE userID == ?")
        selectId.get([id], (err, row) => {
            if (err) {
                reject(err)
            } else {
                resolve(row as UserSettings)
            }
        })
    })
}

export function getScheduleByScriptIDAndOptions(scriptID: number, options: any): Promise<Schedule> {
    return new Promise((resolve, reject) => {
        const select = db.prepare(
            "SELECT * FROM schedule WHERE schedule.scriptID = ? AND schedule.options = ?"
        )
        select.get([scriptID, JSON.stringify(options)], (err, row) => {
            if (err) {
                reject(err)
            } else {
                resolve(row as Schedule)
            }
        })
    })
}

export function getScheduleByID(scriptID: number): Promise<Schedule> {
    return new Promise((resolve, reject) => {
        const select = db.prepare(
            "SELECT * FROM schedule WHERE schedule.id = ?"
        )
        select.get([scriptID], (err, row) => {
            if (err) {
                reject(err)
            } else {
                const schedule : Schedule = row as Schedule
                // @ts-ignore
                schedule.options = JSON.parse(row.options)
                resolve(row as Schedule)
            }
        })
    })
}

export function getFirstFromCalendar(): Promise<Calendar> {
    return new Promise((resolve, reject) => {
        const select = db.prepare(
            "SELECT * FROM calendar ORDER BY datetime LIMIT 1"
        )
        select.get((err, row) => {
            if (err) {
                reject(err)
            } else if (row === undefined) {
                reject("There are no scripts in the calendar")
            } else {
                const calendar: Calendar = row as Calendar
                calendar.datetime = new Date(calendar.datetime)
                resolve(calendar)
            }
        })
    })
}

export function removeFromCalendar(eventID: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const select = db.prepare(
            "DELETE FROM calendar WHERE id = ?"
        )
        select.run([eventID], (err) => {
            if (err == null) {
                resolve(true)
            } else {
                reject(err)
            }
        })
    })
}

