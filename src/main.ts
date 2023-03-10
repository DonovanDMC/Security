import Config from "./config/index.js";
import ClientEvent from "./util/ClientEvent.js";
import Logger from "./util/Logger.js";
import { ApplicationCommandTypes, Client, type CreateApplicationCommandOptions } from "oceanic.js";
import { Strings, Timer } from "@uwu-codes/utils";
import type { ModuleImport } from "@uwu-codes/types";
import {
    access,
    mkdir,
    readdir,
    readFile,
    writeFile
} from "node:fs/promises";

export default class Security extends Client {
    static INSTANCE: Security;
    events = new Map<string, ClientEvent>();
    firstReady = false;
    initTime: bigint;
    readyTime: bigint;
    constructor(initTime: bigint) {
        super(Config.clientOptions);
        Security.INSTANCE = this;
        this.initTime = initTime;
    }

    async dirCheck() {
        const directories = [
            Config.logsDirectory,
            Config.dataDir,
            Config.eventsDirectory
        ];
        for (const dir of directories) {
            await mkdir(dir, { recursive: true });
        }
    }

    async getUser(id: string, forceRest = false) {
        const current = this.users.get(id);
        if (current && !forceRest) {
            return current;
        }
        return this.rest.users.get(id).catch(() => null);
    }

    async handleRegistrationError(commands: Array<CreateApplicationCommandOptions>, err: Error) {
        Logger.getLogger("CommandRegistration").error("Failed To Register Commands:", err);
        for (const cmd of commands) {
            Logger.getLogger("CommandRegistration").error(`Command At ${commands.indexOf(cmd)}: ${cmd.name} (${ApplicationCommandTypes[cmd.type]})`);
        }
    }

    async launch() {
        await this.dirCheck();
        await this.loadEvents();
        await this.connect();
    }

    async loadEvents() {
        const overallStart = Timer.getTime();
        if (!await access(Config.eventsDirectory).then(() => true, () => false))  {
            throw new Error(`Events directory "${Config.eventsDirectory}" does not exist.`);
        }
        const events = (await readdir(Config.eventsDirectory, { withFileTypes: true })).filter(ev => ev.isFile()).map(ev => `${Config.eventsDirectory}/${ev.name}`);
        for (const event of events) {
            const start = Timer.getTime();
            let ev = await import(event) as ModuleImport<ClientEvent>;
            if ("default" in ev) {
                ev = ev.default;
            }
            if (!(ev instanceof ClientEvent)) {
                throw new TypeError(`Export of event file "${event}" is not an instance of ClientEvent.`);
            }
            this.events.set(ev.name, ev);
            this.on(ev.name, ev.listener.bind(this));
            const end = Timer.getTime();
            Logger.getLogger("EventManager").debug(`Loaded the ${ev.name} event in ${Timer.calc(start, end, 3, false)}`);
        }
        const overallEnd = Timer.getTime();
        Logger.getLogger("EventManager").debug(`Loaded ${events.length} ${Strings.plural("event", events)} in ${Timer.calc(overallStart, overallEnd, 3, false)}`);
    }

    async registerCommands() {
        const commands: Array<CreateApplicationCommandOptions> = [
            {
                type:        ApplicationCommandTypes.CHAT_INPUT,
                name:        "register",
                description: "Register for roles and such."
            }
        ];
        const cached = await access(`${Config.dataDir}/commands.json`).then(async() => readFile(`${Config.dataDir}/commands.json`, "utf8")).catch(() => "[]");
        if (JSON.stringify(commands) === cached) {
            Logger.getLogger("CommandRegistration").debug("Commands are up to date, skipping registration.");
            return;
        }
        writeFile(`${Config.dataDir}/commands.json`, JSON.stringify(commands), "utf8").catch(() => null);
        const regStart = Timer.getTime();
        await (this.application.id === "571059650259189770" ? this.application.bulkEditGlobalCommands(commands) : this.application.bulkEditGuildCommands("329498711338123268", commands)).catch(this.handleRegistrationError.bind(this, commands));
        const regEnd = Timer.getTime();
        Logger.getLogger("CommandRegistration").info(`Registered ${commands.length} commands in ${Timer.calc(regStart, regEnd, 3, false)}`);
    }

    shutdown() {
        this.disconnect(false);
    }
}
