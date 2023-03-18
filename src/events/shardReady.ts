import ClientEvent from "../util/ClientEvent.js";
import Logger from "@uwu-codes/logger";

export default new ClientEvent("shardReady", async function shardReadyEvent(id) {
    Logger.info(`Shard #${id} Ready`);
});
