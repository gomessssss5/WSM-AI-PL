import { processBackgroundTasks } from "./scheduledTasksBackground.js";
processBackgroundTasks().then(() => console.log("Done")).catch(console.error);
