import ClientEvent from "../util/ClientEvent.js";
import { buildQuestion } from "../util/buildQuestion.js";
import QuestionHandler from "../util/QuestionHandler.js";
import Logger from "../util/Logger.js";
import ActiveRegistrationHandler from "../util/ActiveRegistrationHandler.js";
import {
    type GuildCommandInteraction,
    InteractionTypes,
    MessageFlags,
    type GuildComponentInteraction,
    type MessageComponentButtonInteractionData,
    type MessageComponentSelectMenuInteractionData
} from "oceanic.js";
import assert from "node:assert";

function is<T>(val: unknown): val is T {
    return true;
}

export default new ClientEvent("interactionCreate", async function interactionCreate(interaction) {
    if (interaction.guildID === null) {
        return;
    }
    switch (interaction.type) {
        case InteractionTypes.APPLICATION_COMMAND: {
            assert(is<GuildCommandInteraction>(interaction));
            switch (interaction.data.name) {
                case "register": {
                    const list = await QuestionHandler.get();
                    if (list[interaction.guildID] === undefined) {
                        return interaction.createMessage({ content: "This server has not been configured.", flags: MessageFlags.EPHEMERAL });
                    }

                    const isActive = ActiveRegistrationHandler.isActive(interaction.guildID, interaction.user.id);
                    if (isActive) {
                        return interaction.createMessage({ content: "You already have an active registration.", flags: MessageFlags.EPHEMERAL });
                    }

                    const serverConfig = list[interaction.guildID];
                    if (serverConfig.disallowDuplicateRegistration && serverConfig.successfulRegistrationRole !== null && interaction.member.roles.includes(serverConfig.successfulRegistrationRole)) {
                        return interaction.createMessage({ content: "You have already registered. Please contact a staff member to change your roles.", flags: MessageFlags.EPHEMERAL });
                    }

                    const start = serverConfig.questions[0];
                    ActiveRegistrationHandler.start(interaction.guildID, interaction.user.id, interaction.token);
                    return interaction.createMessage(buildQuestion(interaction, start));
                }
            }

            return interaction.createMessage({
                content: "I couldn't figure out how to execute that command.",
                flags:   MessageFlags.EPHEMERAL
            });
        }

        case InteractionTypes.MESSAGE_COMPONENT: {
            assert(is<GuildComponentInteraction>(interaction));
            const user = interaction.data.customID.split(".").slice(-1)[0];
            if (user !== interaction.user.id) {
                return interaction.createMessage({
                    content: "That question is not for you.",
                    flags:   MessageFlags.EPHEMERAL
                });
            }
            /* const isActive = ActiveRegistrationHandler.isActive(interaction.guildID, interaction.user.id);
            if (!isActive) {
                return interaction.createMessage({
                    content: "You do not currently have an active registration.",
                    flags:   MessageFlags.EPHEMERAL
                });
            } */
            try {
                const [type, name] = QuestionHandler.getFromID(interaction.data.customID.split(".")[0])!;
                if (type !== "question") {
                    throw new Error("Invalid type recieved");
                }
                const q = await QuestionHandler.getQuestion(interaction.guildID, name);
                if (q === null) {
                    throw new Error("Question not found");
                }
                const choices = q.choiceType === "button" ? [(interaction.data as MessageComponentButtonInteractionData).customID.split(".")[1]] : (interaction.data as MessageComponentSelectMenuInteractionData).values.getStrings();
                const roles: Array<string> = [];
                const choiceNames: Array<string> = [];
                for (const encodedChoice of choices) {
                    const [t, cname] = QuestionHandler.getFromID(encodedChoice)!;
                    const choice = q.choices.find(c => c.name === cname);
                    choiceNames.push(cname);
                    if (t !== "choice" || choice === undefined) {
                        throw new Error("Invalid choice");
                    }
                    roles.push(...choice.roles);
                }
                ActiveRegistrationHandler.saveChoices(interaction.guildID, interaction.user.id, q.name, roles, choiceNames, interaction.token);

                const next = await QuestionHandler.getNextQuestion(interaction.guildID, q.name, ActiveRegistrationHandler.getPreviousRoles(interaction.guildID, interaction.user.id));
                if (next === null) {
                    const r = await ActiveRegistrationHandler.end(interaction.guildID, interaction.user.id);
                    if (r === null) {
                        throw new Error("Registration not found");
                    }
                    for (const role of r) {
                        if (!interaction.member.roles.includes(role)) {
                            await interaction.member.addRole(role, "Registration");
                        }
                    }
                    const serverConfig = await QuestionHandler.getServerConfig(interaction.guildID);
                    if (serverConfig.successfulRegistrationRole !== null && !interaction.member.roles.includes(serverConfig.successfulRegistrationRole)) {
                        await interaction.member.addRole(serverConfig.successfulRegistrationRole, "Registration");
                    }
                    return interaction.editOriginal({
                        content: "Your registration has been completed.",
                        flags:   MessageFlags.EPHEMERAL
                    });
                } else {
                    return interaction.editOriginal(buildQuestion(interaction, next));
                }
            } catch (err) {
                Logger.getLogger("RegistrationError").error("User:", interaction.user.id, "Guild:", interaction.guildID, "Custom ID:", interaction.data.customID, err);
                return interaction.editOriginal({
                    content: "An internal error occured.",
                    flags:   MessageFlags.EPHEMERAL
                });
            }
        }
    }
});
