import http = require('http');
import {createDB} from "./sql/database";
import {parseExecute, parseInsert, parseSchedule, parseLoadScript, parseCreateUser, parseUpdate, parseAuthenticate, parseLoadDirectory, getParentDirectory, parseCreateDirectory, parseDelete, parseUpdateUserSettings} from "./parser";
import {configureSchedule} from "./scheduler";

createDB();
const PORT = 3001;
// TODO: change http to https?
/**
 * Every (choose correct later) http request should have:
 *  a) type
 *      1) insertScript
 *      2) execScript
 *      3) scheduleScript
 *      4) loadScript
 *      5) createUser
 *      4) TODO
 *  b) TODO
 *
 * Every insertScript request should have:
 *  a) user
 *  b) title (unique for that user)
 *  c) source
 *
 *
 * Every execScript should have:
 *  a) user
 *  b) title
 *
 *
 * Every scheduleScript should have:
 *  a) user
 *  b) title
 *  c) scheduleOptions (json that explains how the script should be scheduled)
 *
 *  ScheduleOptions:
 *      a) "tag" among { once, times, every }
 *          1) for {times} '"times": number' member should be filled. For now, times <= 9 to
 *          2) for {every} '"every": string' should be filled with {hour, day, week, month}. It means, that script could be executed in that time period
 *          3) for {once}, one could paste exact time of scripts' execution, f.e. '"once": date
 *      TODO:b) "interval"
 *          1) '"min": number' min number of seconds before two consequences execution (and before the first one)
 *          2) '"max": number' max --..--
 *
 *
 * Every createUser should have
 *  a) username
 *  b) password
 *
 *
 */

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
    console.log("GOT REQUEST");

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            console.log(body);
            let bodyJSON : any;
            try {
                bodyJSON = JSON.parse(body);
            } catch (error) {
                console.error(error);
                return;
            }

            const handleResponse = (status: number, message: string | object) => {
                const response = JSON.stringify({ status, message });
                res.end(response);
            };

            const parseAction = async <T>(
                action: (data: any) => Promise<T>,
                successMessage: (result: T) => string | object
            ) => {
                try {
                    const result = await action(bodyJSON);
                    handleResponse(0, successMessage(result));
                } catch (error: any) {
                    if (typeof error == "string") {
                        handleResponse(1, error);
                    } else {
                        handleResponse(1, error.message);
                    }
                }
            };

            switch (bodyJSON.type) {
                case 'insertScript':
                    parseAction(parseInsert, () => `Saved script ${bodyJSON.title}`);
                    break;
                case 'deleteScript':
                    parseAction(parseDelete, (title: string) => `Deleted script ${title}`);
                    break;
                case 'updateScript':
                    parseAction(parseUpdate, (title: string) => `Saved script ${title}`);
                    break;
                case 'execScript':
                    parseAction(parseExecute, (title: string) => `Running script ${title}`);
                    break;
                case 'scheduleScript':
                    parseAction(parseSchedule, (result: Date) => `Scheduled on ${result}`);
                    break;
                case 'loadScript':
                    parseAction(parseLoadScript, (script: any) => ({
                        message: `Loaded script ${script.title} successfully`,
                        source: script.source
                    }));
                    break;
                case 'loadDirectory':
                    parseAction(parseLoadDirectory, (contents: any) => ({
                        message: 'Loaded directory successfully',
                        contents
                    }));
                    break;
                case 'getParent':
                    parseAction(getParentDirectory, (path: string) => ({
                        message: 'Loaded directory successfully',
                        path
                    }));
                    break;
                case 'createDirectory':
                    parseAction(parseCreateDirectory, () => `Created new directory ${bodyJSON.name}`);
                    break;
                case 'createUser':
                    parseAction(parseCreateUser, () => `Created new user ${bodyJSON.username} successfully`);
                    break;
                case 'updateUserSettings':
                    parseAction(parseUpdateUserSettings, (response) => response);
                    break;
                case 'signIn':
                    parseAuthenticate(bodyJSON)
                        .then(_ => handleResponse(0, 'Logged in successfully'))
                        .catch(error => {
                            console.log(error);
                            handleResponse(1, error.message);
                        });
                    break;
                default:
                    handleResponse(1, 'Unknown request type');
            }
        });
    } else {
        res.end();
    }
});


configureSchedule()

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})
