import Config from "../config/index.js";
import {
    type ButtonQuestion,
    type HashedQuestion,
    type InputQuestion,
    type Root,
    type SelectQuestion,
    validateServerConfig
} from "../schema.js";
import { parse } from "jsonc-parser";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

export default class QuestionHandler {
    private static cache: Root | undefined;
    private static hashMap: Map<string, `${"Q" | "C" | "F"}${string}`> = new Map();
    static path = `${Config.baseDir}/servers.jsonc`;
    // map of guild id to map of hash to question name & question name to hash
    static questionMap: Array<HashedQuestion> = [];

    static async get() {
        return (this.cache ??= await this.load());
    }

    static getChoiceID(guild: string, name: string, choice: string) {
        return this.questionMap.find(q => q.guild === guild && q.name === name)!.choices[choice];
    }

    static getFromID(id: string) {
        const val = this.hashMap.get(id);
        return val === undefined ? null : [val.startsWith("Q") ? "question" : (val.startsWith("F") ? "field" : "choice"), val.slice(1)] as ["question" | "choice" | "field", string];
    }

    static getInputID(guild: string, name: string, field: string) {
        return this.questionMap.find(q => q.guild === guild && q.name === name)!.fields[field];
    }

    static async getNextQuestion(guild: string, name: string, previous: Record<string, Array<string>>): Promise<SelectQuestion | ButtonQuestion | InputQuestion | null> {
        const { questions } = (await this.get())[guild];
        if (questions === undefined) {
            return null;
        }
        const index = questions.findIndex(q => q.name === name);
        const next = questions[index + 1];
        if (next === undefined) {
            return null;
        }

        if (await this.shouldShow(guild, next.name, previous)) {
            return next;
        }

        return (index + 1) === questions.length ? null : this.getNextQuestion(guild, next.name, previous);
    }

    static async getQuestion(guild: string, name: string) {
        return (await this.get())[guild]?.questions.find(q => q.name === name) ?? null;
    }

    static getQuestionID(guild: string, name: string) {
        return this.questionMap.find(q => q.guild === guild && q.name === name)!.hash;
    }

    static async getServerConfig(guild: string) {
        return (await this.get())[guild];
    }

    static async isFirst(guild: string, name: string) {
        return (await this.get())[guild]?.questions.findIndex(q => q.name === name) === 0;
    }

    // restart to load new config
    static async load() {
        const settings = await parse(await readFile(this.path, "utf8")) as Root;
        for (const [guild, serverConfig] of Object.entries(settings)) {
            validateServerConfig(serverConfig);
            if (validateServerConfig.errors) {
                console.error(validateServerConfig.errors);
                throw new Error(`Invalid server config for guild ${guild}`);
            }
            for (const option of serverConfig.questions) {
                const hash: string = createHash("md5").update(JSON.stringify(option)).digest("hex");
                this.hashMap.set(hash, `Q${option.name}`);
                let choices: Record<string, string> = {}, fields: Record<string, string> = {};
                if (option.type === "input") {
                    fields = option.fields.map(field => {
                        const h = createHash("md5").update(JSON.stringify(field)).digest("hex");
                        this.hashMap.set(h, `F${field.name}`);
                        return {
                            [field.name]: h
                        };
                    }).reduce((a, b) => ({ ...a, ...b }), {});
                } else {
                    choices = option.choices.map(choice => {
                        const h = createHash("md5").update(JSON.stringify(choice)).digest("hex");
                        this.hashMap.set(h, `C${choice.name}`);
                        return {
                            [choice.name]: h
                        };
                    }).reduce((a, b) => ({ ...a, ...b }), {});
                }
                this.questionMap.push({
                    guild,
                    name: option.name,
                    hash,
                    choices,
                    fields
                });
            }
        }

        return settings;
    }

    /**
     * If a question should be shown, given the conditions.
     * @param guild The ID of the guild the questions should be pulled from.
     * @param name The name of the option.
     * @param previous A map of question name to gained roles from previous options.
     */
    static async shouldShow(guild: string, name: string, previous: Record<string, Array<string>>) {
        const serverConfig = await this.get();
        const question = serverConfig[guild]?.questions.find(q => q.name === name);
        if (question === undefined) {
            return false;
        }
        if (question.condition === null) {
            return true;
        }

        for (const [conditionName, role] of Object.entries(question.condition)) {
            const previousRoles = previous[conditionName];
            if (previousRoles === undefined) {
                return false;
            }
            if (!previousRoles.includes(role)) {
                return false;
            }
        }

        return true;
    }
}
