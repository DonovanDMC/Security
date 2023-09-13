/* eslint-disable @typescript-eslint/member-ordering */
import { EnvOverride } from "@uwu-codes/utils";
import { ActivityTypes, type ClientOptions } from "oceanic.js";
import { parse } from "jsonc-parser";
import { access, readFile } from "node:fs/promises";

interface IConfig {
    token: string;
    welcomeAuth: string;
}
const baseDir = new URL(`../../${import.meta.url.endsWith(".js") ? "" : ""}`, import.meta.url).pathname.slice(0, -1);
const JSONConfig = parse(await readFile(`${baseDir}/config.jsonc`, "utf8")) as IConfig;

const isDocker = await access("/.dockerenv").then(() => true, () => false) || await readFile("/proc/1/cgroup", "utf8").then(contents => contents.includes("docker"));
class Configuration {
    static get isDevelopment() {
        return true;
    }

    static get isDocker() {
        return isDocker;
    }

    /* directories */
    static get baseDir() {
        return baseDir;
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
            auth:                      this.clientToken,
            defaultImageFormat:        "png",
            defaultImageSize:          4096,
            gateway:                   {
                autoReconnect: true,
                concurrency:   "auto",
                intents:       ["GUILDS", "GUILD_MEMBERS"],
                maxShards:     "auto",
                presence:      {
                    activities: [{
                        type: ActivityTypes.WATCHING,
                        name: "over all you fluffers."
                    }],
                    status: "dnd"
                },
                getAllUsers: true
            }
        } satisfies ClientOptions as ClientOptions;
    }

    static get dryRun() {
        return !isDocker;
    }
    static get clientToken() {
        return JSONConfig.token;
    }

    static get welcomeAuth() {
        return JSONConfig.welcomeAuth;
    }
}
const Config = EnvOverride("SECURITY_", Configuration);
export default Config;
