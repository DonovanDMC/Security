import QuestionHandler from "./QuestionHandler.js";
import Welcome from "./Welcome.js";
import type Security from "../main";
import Config from "../config/index.js";
import { type GuildComponentInteraction, type GuildModalSubmitInteraction, MessageFlags } from "oceanic.js";

interface ActiveRegistration {
    guild: string;
    interactionToken: string; // for sending a timeout notification
    lastAnsweredAt: Date;
    roles: Record<string, Array<string>>;
    stringAnswers: Record<string, Array<string>>;
    user: string;
}
export default class ActiveRegistrationHandler {
    private static client: Security;
    static active: Array<ActiveRegistration> = [];
    private static async handleTimeout() {
        const list = this.active.filter(reg => reg.lastAnsweredAt.getTime() + 60000 < Date.now());
        for (const reg of list) {
            this.active.splice(this.active.indexOf(reg), 1);
            console.log("Time Out:", reg);
            await this.client.rest.interactions.createFollowupMessage(this.client.application.id, reg.interactionToken, {
                content: "You took too long to answer the questions. Your registration has been canceled.",
                flags:   MessageFlags.EPHEMERAL
            }).catch(() => null);
            const serverConfig = await QuestionHandler.getServerConfig(reg.guild);
            const user = (await this.client.getUser(reg.user))!;
            if (serverConfig.logsChannel) {
                await this.client.rest.channels.createMessage(serverConfig.logsChannel, {
                    embeds: [
                        {
                            author: {
                                name:    user.tag,
                                iconURL: user.avatarURL()
                            },
                            title:  "Failed Registration",
                            color:  0xDC143C,
                            fields: serverConfig.questions.map(q => ({
                                name:   q.name,
                                value:  reg.stringAnswers[q.name]?.join(", ") ?? "N/A",
                                inline: true
                            })),
                            footer: {
                                text: `User ID: ${reg.user} | Reason: Timeout`
                            },
                            timestamp: new Date().toISOString()
                        }
                    ]
                });
            }
        }
    }

    static async end(guild: string, user: string) {
        const reg = this.active.find(r => r.guild === guild && r.user === user);
        if (reg === undefined) {
            return null;
        }
        this.active.splice(this.active.indexOf(reg), 1);
        const serverConfig = await QuestionHandler.getServerConfig(reg.guild);
        const usr = (await this.client.getUser(reg.user))!;
        if (serverConfig.logsChannel !== null) {
            await this.client.rest.channels.createMessage(serverConfig.logsChannel, {
                embeds: [
                    {
                        author: {
                            name:    usr.tag,
                            iconURL: usr.avatarURL()
                        },
                        title:  "Successful Registration",
                        color:  0x008000,
                        fields: serverConfig.questions.map(q => ({
                            name:   q.name,
                            value:  reg.stringAnswers[q.name]?.join(", ") ?? "N/A",
                            inline: true
                        })),
                        footer: {
                            text: `User ID: ${reg.user}`
                        },
                        timestamp: new Date().toISOString()
                    }
                ]
            });
        }
        return Object.values(reg.roles).flat();
    }

    static getPreviousRoles(guild: string, user: string) {
        const reg = this.active.find(r => r.guild === guild && r.user === user);
        if (reg === undefined) {
            return {};
        }
        return reg.roles;
    }

    static async handleEnd(interaction: GuildComponentInteraction | GuildModalSubmitInteraction) {
        const r = await ActiveRegistrationHandler.end(interaction.guildID, interaction.user.id);
        if (r === null) {
            throw new Error("Registration not found");
        }
        if (!Config.dryRun) {
            for (const role of r) {
                if (!interaction.member.roles.includes(role)) {
                    await interaction.member.addRole(role, "Registration");
                }
            }

            const serverConfig = await QuestionHandler.getServerConfig(interaction.guildID);
            welcome: if (serverConfig.welcome !== null) {
                if (typeof serverConfig.welcome === "object" && (!serverConfig.welcome.join || !serverConfig.welcome.requiredRoles.some(role => r.includes(role)))) {
                    break welcome;
                }
                await Welcome.run(interaction.guildID, interaction.member.id, "join", typeof serverConfig.welcome === "object" ? serverConfig.welcome.force : false);
            }

            if (typeof serverConfig.successfulRegistrationRole === "string" && !interaction.member.roles.includes(serverConfig.successfulRegistrationRole)) {
                await interaction.member.addRole(serverConfig.successfulRegistrationRole, "Registration");
            }
        }

        return interaction.editParent({
            content:    "Your registration has been completed.",
            flags:      MessageFlags.EPHEMERAL,
            components: []
        }).catch(() => interaction.createMessage({
            content:    "Your registration has been completed.",
            flags:      MessageFlags.EPHEMERAL,
            components: []
        }));
    }

    static init(client: Security) {
        this.client = client;
        setInterval(this.handleTimeout.bind(this), 1000);
    }

    static isActive(guild: string, user: string) {
        return this.active.some(reg => reg.guild === guild && reg.user === user);
    }

    static saveChoices(guild: string, user: string, question: string, roles: Array<string>, stringValues: Array<string>, token: string) {
        let rg: ActiveRegistration | undefined;
        const reg = rg = this.active.find(r => r.guild === guild && r.user === user);
        if (reg === undefined || rg === undefined) {
            return;
        }
        // question -> roles
        reg.roles[question] = roles;
        // question -> string values
        reg.stringAnswers[question] = stringValues;
        reg.lastAnsweredAt = new Date();
        reg.interactionToken = token;
        this.active.splice(this.active.indexOf(rg), 1, reg);
    }

    static saveInputs(guild: string, user: string, question: string, roles: Record<string, Array<string>>, inputMap: Record<string, string>, token: string) {
        let rg: ActiveRegistration | undefined;
        const reg = rg = this.active.find(r => r.guild === guild && r.user === user);
        if (reg === undefined || rg === undefined) {
            return;
        }
        // question -> roles
        reg.roles[question] = Object.values(roles).flat();
        // question -> string values
        reg.stringAnswers[question] = Object.entries(inputMap).map(([k, v]) => `${k}: ${v}`);
        // question.field -> roles
        Object.entries(inputMap).map(([k]) => reg.roles[`${question}.${k}`] = roles[k]);
        reg.lastAnsweredAt = new Date();
        reg.interactionToken = token;
        this.active.splice(this.active.indexOf(rg), 1, reg);
    }

    static start(guild: string, user: string, token: string) {
        this.active.push({
            guild,
            user,
            roles:            {},
            stringAnswers:    {},
            lastAnsweredAt:   new Date(),
            interactionToken: token
        });
    }
}
