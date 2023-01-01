import LocalConfiguration from "./private/private.js";
import { EnvOverride } from "@uwu-codes/utils";
import { ActivityTypes, type ClientOptions } from "oceanic.js";
import { access, readFile } from "node:fs/promises";

const isDocker = await access("/.dockerenv").then(() => true, () => false) || await readFile("/proc/1/cgroup", "utf8").then(contents => contents.includes("docker"));
class Configuration extends LocalConfiguration {
    static get isDevelopment() {
        return true;
    }

    static get isDocker() {
        return isDocker;
    }

    /* directories */
    static get baseDir() {
        return new URL(`../../${import.meta.url.endsWith(".js") ? "../" : ""}`, import.meta.url).pathname.slice(0, -1);
    }

    static get dataDir() {
        return this.isDocker ? "/data" : `${this.baseDir}/data/bot`;
    }

    static get logsDirectory() {
        return `${this.dataDir}/logs`;
    }

    static get eventsDirectory() {
        return new URL("../events", import.meta.url).pathname;
    }

    static get clientOptions() {
        return {
            allowedMentions: {
                users:       true,
                roles:       false,
                everyone:    false,
                repliedUser: false
            },
            disableMemberLimitScaling: true,
            auth:                      `Bot ${this.clientToken}`,
            defaultImageFormat:        "png",
            defaultImageSize:          4096,
            gateway:                   {
                autoReconnect: true,
                concurrency:   "auto",
                intents:       [],
                maxShards:     "auto",
                presence:      {
                    activities: [{
                        type: ActivityTypes.WATCHING,
                        name: "over all you fluffers."
                    }],
                    status: "dnd"
                }
            }
        } satisfies ClientOptions as ClientOptions;
    }
}
const Config = EnvOverride("SECURITY_", Configuration);
export default Config;
