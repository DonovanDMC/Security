import ClientEvent from "../util/ClientEvent.js";
import Logger from "@uwu-codes/logger";

export default new ClientEvent("shardDisconnect", async function shardDisconnectEvent(err, id) {
    Logger.error(`Shard #${id} Disconnected`, err);
});
