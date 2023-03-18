import ClientEvent from "../util/ClientEvent.js";
import ActiveRegistrationHandler from "../util/ActiveRegistrationHandler.js";
import Logger from "@uwu-codes/logger";
import { Time } from "@uwu-codes/utils";


export default new ClientEvent("ready", async function readyEvent() {
    if (this.firstReady === true) {
        return Logger.getLogger("Ready").warn("Ready event called after first ready, ignoring.");
    }
    this.firstReady = true;
    ActiveRegistrationHandler.init(this);
    await this.registerCommands();
    this.readyTime = process.hrtime.bigint();
    Logger.info(`Ready as ${this.user.username}#${this.user.discriminator} in ${Time.ms((this.readyTime - this.initTime) / 1000000n, { words: true, ms: true, shortMS: true })}`);
});
