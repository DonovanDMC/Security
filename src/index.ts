import Config from "./config/index.js";
import Security from "./main.js";
import Logger from "./util/Logger.js";
import { StatusServer, Time } from "@uwu-codes/utils";
import { type Server } from "node:http";

const initTime = process.hrtime.bigint();
const bot = new Security(initTime);
await bot.rest.getBotGateway().then(function preLaunchInfo({ sessionStartLimit: { remaining, total, resetAfter }, shards }) {
    Logger.getLogger("Launch").info(`Mode: ${Config.isDevelopment ? "BETA" : "PROD"} | CWD: ${process.cwd()} | PID: ${process.pid}`);
    Logger.getLogger("Launch").info(`Session Limits: ${remaining}/${total} - Reset: ${Time.dateToReadable(new Date(Date.now() + resetAfter))} | Recommended Shards: ${shards}`);
    Logger.getLogger("Launch").info("Node Version:", process.version);
    Logger.getLogger("Launch").info(`Platform: ${process.platform} (Manager: ${Config.isDocker ? "Docker" : "None"})`);
    return bot.launch();
});

process
    .on("uncaughtException", err => Logger.getLogger("Uncaught Exception").error(err))
    .on("unhandledRejection", (r, p) => Logger.getLogger("Unhandled Rejection").error(r, p))
    .once("SIGINT", () => {
        bot.shutdown();
        statusServer?.close();
        process.kill(process.pid, "SIGINT");
    })
    .once("SIGTERM", () => {
        bot.shutdown();
        statusServer?.close();
        process.kill(process.pid, "SIGTERM");
    });

let statusServer: Server | undefined;

if (Config.isDocker) {
    statusServer = StatusServer(() => bot.ready);
}
