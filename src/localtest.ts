import {
    createDB,
    getFirstFromCalendar, getPathByParent,
    insertUser,
    updateScheduleOptionsByID
} from "./sql/database";
import {
    parseExecute,
    parseInsert,
    parseSchedule,
    createUser,
    parseCreateUser,
    authenticateUser,
    parseDelete,
    parseUpdate,
    parseLoadScript,
    parseCreateDirectory,
    parseLoadDirectory,
} from "./parser";
import {configureSchedule} from "./scheduler";
import {deleteFromPath} from "./helpers/scriptsDymDeleting";

const main = async () => {
    createDB()
    configureSchedule()


    console.log(await parseDelete({
        user: "admin2",
        password: "admin2",
        path: "admin2/"
    }))

    console.log('next')

    //await insertUser('admin')
    //await insertUser('crypto')
    //console.log(dumpyConstant)
    /*await parseExecute({
        user: "crypto",
        title: "scriptTitle",
    })*/
    /*await parseExecute({
        user: "crypto",
        title: "scriptTitle",
    })*/
    /*const date = await parseSchedule({
        user: "crypto",
        title: "scriptTitle",
        scheduleOptions: {
            tag: "once",
            once: {
                date: "2023-04-18 10:46:40"
            }
        }
    })*/
    /*const date = await parseSchedule({
        user: "admin",
        title: "notion4",
        scheduleOptions: {
            tag: "times",
            times: {
                timesExecution: 4,
                minWaitMinute: 60 * 12,
                maxWaitMinute: 60 * 12
            },
        }
    })*/
    /*const date = await parseSchedule({
        user: "crypto",
        title: "scriptTitle",
        scheduleOptions: {
            tag: "times",
            times: {
                timesExecution: 1,
                minWaitMinute: 0,
                maxWaitMinute: 0,
            },
            scriptOptions: {
                tokenName: 'USDC',
                tokenAmountMin: 8,
                tokenAmountMax: 10,
            }
        }
    })*/
    //await updateScheduleOptionsByID(44, {})
    // TODO: WRONG. CHANGE IT
    //await insertUser('crypto')
    //console.log(await getFirstFromCalendar())
    /*const date = await parseSchedule({
        user: "admin",
        title: "title",
        scheduleOptions: {
            tag: "once",
            once: "2023-04-18 10:46:40"
        }
    })*/

}
main()