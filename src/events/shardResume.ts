import ClientEvent from "../util/ClientEvent.js";
import Logger from "@uwu-codes/logger";

export default new ClientEvent("shardResume", async function shardResumeEvent(id) {
    Logger.info(`Shard #${id} Resumed`);
});
