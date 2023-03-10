import ClientEvent from "../util/ClientEvent.js";
import { buildQuestion } from "../util/buildQuestion.js";
import QuestionHandler from "../util/QuestionHandler.js";
import Logger from "../util/Logger.js";
import ActiveRegistrationHandler from "../util/ActiveRegistrationHandler.js";
import matcher from "../util/matcher.js";
import {
    type GuildCommandInteraction,
    InteractionTypes,
    MessageFlags,
    type GuildComponentInteraction,
    type MessageComponentButtonInteractionData,
    type MessageComponentSelectMenuInteractionData,
    type GuildModalSubmitInteraction,
    ComponentTypes,
    ButtonStyles,
    type InteractionContent
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

                    if (interaction.member.pending) {
                        return interaction.createMessage({ content: "You must pass the welcome gate before registering.", flags: MessageFlags.EPHEMERAL });
                    }

                    const isActive = ActiveRegistrationHandler.isActive(interaction.guildID, interaction.user.id);
                    if (isActive) {
                        return interaction.createMessage({ content: "You already have an active registration.", flags: MessageFlags.EPHEMERAL });
                    }

                    const serverConfig = list[interaction.guildID];
                    if (serverConfig.disallowDuplicateRegistration && serverConfig.successfulRegistrationRole !== null && interaction.member.roles.includes(serverConfig.successfulRegistrationRole)) {
                        return interaction.createMessage({ content: "You have already registered. Please contact a staff member to change your roles.", flags: MessageFlags.EPHEMERAL });
                    }

                    if (interaction.member.roles.some(role => serverConfig.blockedRoles.includes(role))) {
                        return interaction.createMessage({ content: "You are not allowed to register.", flags: MessageFlags.EPHEMERAL });
                    }

                    const start = serverConfig.questions[0];
                    ActiveRegistrationHandler.start(interaction.guildID, interaction.user.id, interaction.token);
                    await (start.type === "input" ? interaction.createModal(buildQuestion(interaction, start)) : interaction.createMessage(buildQuestion(interaction, start)));
                    return;
                }
            }

            return interaction.createMessage({
                content: "I couldn't figure out how to execute that command.",
                flags:   MessageFlags.EPHEMERAL
            });
        }

        case InteractionTypes.MESSAGE_COMPONENT: {
            assert(is<GuildComponentInteraction>(interaction));
            const user = interaction.data.customID.split(".").at(-1);
            if (user !== interaction.user.id) {
                return interaction.createMessage({
                    content: "That question is not for you.",
                    flags:   MessageFlags.EPHEMERAL
                });
            }

            const isActive = ActiveRegistrationHandler.isActive(interaction.guildID, interaction.user.id);
            if (!isActive) {
                return interaction.createMessage({
                    content: "You do not currently have an active registration.",
                    flags:   MessageFlags.EPHEMERAL
                });
            }

            if (interaction.data.customID.split(".")[0] === "next-from-modal") {
                const [type, name] = QuestionHandler.getFromID(interaction.data.customID.split(".")[1])!;
                if (type !== "question") {
                    throw new Error("Invalid type recieved");
                }

                const q = await QuestionHandler.getQuestion(interaction.guildID, name);
                if (q === null || q.type !== "input") {
                    throw new Error("Question not found");
                }

                return interaction.createModal(buildQuestion(interaction, q));
            }
            try {
                const [type, name] = QuestionHandler.getFromID(interaction.data.customID.split(".")[0])!;
                if (type !== "question") {
                    throw new Error("Invalid type recieved");
                }
                const q = await QuestionHandler.getQuestion(interaction.guildID, name);
                if (q === null || (q.type !== "button" && q.type !== "select")) {
                    throw new Error("Question not found");
                }
                const choices = q.type === "button" ? [(interaction.data as MessageComponentButtonInteractionData).customID.split(".")[1]] : (interaction.data as MessageComponentSelectMenuInteractionData).values.getStrings();
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
                    return ActiveRegistrationHandler.handleEnd(interaction);
                } else {
                    return (next.type === "input" ? interaction.createModal(buildQuestion(interaction, next)) : interaction.editParent(buildQuestion(interaction, next)));
                }
            } catch (err) {
                Logger.getLogger("RegistrationError").error("User:", interaction.user.id, "Guild:", interaction.guildID, "Custom ID:", interaction.data.customID, err);
                return interaction.createMessage({
                    content:    "An internal error occured.",
                    flags:      MessageFlags.EPHEMERAL,
                    components: []
                });
            }
        }

        case InteractionTypes.MODAL_SUBMIT: {
            assert(is<GuildModalSubmitInteraction>(interaction));
            const user = interaction.data.customID.split(".").at(-1);
            if (user !== interaction.user.id) {
                return interaction.createMessage({
                    content: "That question is not for you.",
                    flags:   MessageFlags.EPHEMERAL
                });
            }
            try {
                const [type, name] = QuestionHandler.getFromID(interaction.data.customID.split(".")[0])!;
                if (type !== "question") {
                    throw new Error("Invalid type recieved");
                }

                const q = await QuestionHandler.getQuestion(interaction.guildID, name);
                if (q === null || q.type !== "input") {
                    throw new Error("Question not found");
                }
                const isFirst = await QuestionHandler.isFirst(interaction.guildID, name);
                const createMessage = async(content: InteractionContent) => (isFirst ? (interaction.acknowledged ? interaction.createFollowup.bind(interaction) : interaction.createMessage.bind(interaction)) : interaction.editParent.bind(interaction))(content);

                const roles: Record<string, Array<string>> = {};
                const fieldMap: Record<string, string> = {};
                for (const { components: [component] } of interaction.data.components) {
                    const [t, fname] = QuestionHandler.getFromID(component.customID.split(".")[1])!;
                    const field = q.fields.find(c => c.name === fname);
                    if (t !== "field" || field === undefined) {
                        throw new Error("Invalid field");
                    }
                    if (!component.value) {
                        if (field.required) {
                            return createMessage({
                                content: "You must fill out all required fields.",
                                flags:   MessageFlags.EPHEMERAL
                            });
                        } else {
                            continue;
                        }
                    }
                    switch (field.parse) {
                        case "number": {
                            if (isNaN(Number(component.value))) {
                                return createMessage({
                                    content: "You must provide a number.",
                                    flags:   MessageFlags.EPHEMERAL
                                });
                            }
                        }
                    }
                    fieldMap[field.name] = component.value;
                    for (const res of field.results) {
                        const isMatch = matcher(res.type, res.value, component.value);
                        if (isMatch) {
                            roles[field.name] ??= [];
                            roles[field.name].push(...res.roles);
                        }
                    }
                }
                ActiveRegistrationHandler.saveInputs(interaction.guildID, interaction.user.id, q.name, roles, fieldMap, interaction.token);

                const next = await QuestionHandler.getNextQuestion(interaction.guildID, q.name, ActiveRegistrationHandler.getPreviousRoles(interaction.guildID, interaction.user.id));
                if (next === null) {
                    return ActiveRegistrationHandler.handleEnd(interaction);
                } else {
                    await (next.type === "input" ? createMessage({
                        content:    "Discord doesn't allow stacking modals, and the next question is also a modal. Please click the button below to continue.",
                        flags:      MessageFlags.EPHEMERAL,
                        components: [
                            {
                                type:       ComponentTypes.ACTION_ROW,
                                components: [
                                    {
                                        type:     ComponentTypes.BUTTON,
                                        style:    ButtonStyles.PRIMARY,
                                        label:    "Continue",
                                        customID: `next-from-modal.${QuestionHandler.getQuestionID(interaction.guildID, next.name)}.${interaction.user.id}`
                                    }
                                ]
                            }
                        ]
                    }) : createMessage(buildQuestion(interaction, next)));
                }
            } catch (err) {
                Logger.getLogger("RegistrationError").error("User:", interaction.user.id, "Guild:", interaction.guildID, "Custom ID:", interaction.data.customID, err);
                return interaction.createMessage({
                    content:    "An internal error occured.",
                    flags:      MessageFlags.EPHEMERAL,
                    components: []
                });
            }
            break;
        }
    }
});
