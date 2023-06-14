import {getFirstFromCalendar, getPathByID, getScheduleByID,getUserSettingsByUserID, removeFromCalendar} from "./sql/database";
import {runWorker} from "./workersManager";
import {addToCalendar, getScriptPath} from "./parser";

export const configureSchedule = () => {
    return setInterval(async () => {
        let processed = true;
        while (processed) {
            processed = await processNextEvent();
        }
    }, 1000);
};

const processNextEvent = async (): Promise<boolean> => {
    try {
        const event = await getFirstFromCalendar();
        if (event.datetime.getTime() <= Date.now()) {
            console.log(`Processing scheduled scripts "${event.id} script=${event.scheduleID}". Date: ${event.datetime}`);
            const schedule = await getScheduleByID(event.scheduleID);
            const options = schedule.options;
            const script = await getPathByID(schedule.scriptID)
            script.path = getScriptPath(script.path, script.pureJSCode)
            await removeFromCalendar(event.id);
            const userSettings = await getUserSettingsByUserID(script.user)
            options.lastRunFeedback = await runWorker({
                workerData: {
                    script: script,
                    lastRunFeedback: options.lastRunFeedback,
                    scriptOptions: options.scriptOptions
                }
            }, userSettings);
            await addToCalendar(script, options, false, event.scheduleID);
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
};
