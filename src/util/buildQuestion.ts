import QuestionHandler from "./QuestionHandler.js";
import type { ButtonQuestion, InputQuestion, SelectQuestion } from "../schema.js";
import {
    ComponentTypes,
    type InteractionContent,
    type GuildCommandInteraction,
    type MessageActionRow,
    MessageFlags,
    type GuildComponentInteraction,
    type ModalActionRow,
    TextInputStyles,
    type ModalData,
    type GuildModalSubmitInteraction
} from "oceanic.js";
import chunk from "chunk";

type OutputType<T extends SelectQuestion | ButtonQuestion | InputQuestion> =
T extends SelectQuestion | ButtonQuestion ? InteractionContent :
    T extends InputQuestion ? ModalData :
        never;
export function buildQuestion<T extends SelectQuestion | ButtonQuestion | InputQuestion>(interaction: GuildCommandInteraction | GuildComponentInteraction | GuildModalSubmitInteraction, question: T): OutputType<T> {
    switch (question.type) {
        case "select": {
            return {
                content:    question.question,
                components: [
                    {
                        type:       ComponentTypes.ACTION_ROW,
                        components: [
                            {
                                type:      ComponentTypes.STRING_SELECT,
                                minValues: 1,
                                maxValues: question.multiSelect === true ? question.choices.length : (question.multiSelect === false ? 1 : question.multiSelect),
                                customID:  `${QuestionHandler.getQuestionID(interaction.guildID, question.name)}.${interaction.user.id}`,
                                options:   question.choices.map(choice => ({
                                    label: choice.name,
                                    value: QuestionHandler.getChoiceID(interaction.guildID, question.name, choice.name)
                                }))
                            }
                        ]
                    }
                ],
                flags: MessageFlags.EPHEMERAL
            } satisfies InteractionContent as never;
        }

        case "button": {
            const components: Array<MessageActionRow> = [];
            for (const group of chunk(question.choices, 5)) {
                components.push({
                    type:       ComponentTypes.ACTION_ROW,
                    components: group.map(choice => ({
                        type:     ComponentTypes.BUTTON,
                        style:    choice.style,
                        label:    choice.name,
                        customID: `${QuestionHandler.getQuestionID(interaction.guildID, question.name)}.${QuestionHandler.getChoiceID(interaction.guildID, question.name, choice.name)}.${interaction.user.id}`
                    }))
                });
            }

            return {
                content: question.question,
                components,
                flags:   MessageFlags.EPHEMERAL
            } satisfies InteractionContent as never;
        }

        case "input": {
            const components: Array<ModalActionRow> = [];

            for (const [field] of chunk(question.fields, 1)) {
                components.push({
                    type:       ComponentTypes.ACTION_ROW,
                    components: [
                        {
                            type:        ComponentTypes.TEXT_INPUT,
                            style:       field.type === "short" ? TextInputStyles.SHORT : TextInputStyles.PARAGRAPH,
                            label:       field.name,
                            required:    field.required,
                            placeholder: field.placeholder ?? undefined,
                            customID:    `${QuestionHandler.getQuestionID(interaction.guildID, question.name)}.${QuestionHandler.getInputID(interaction.guildID, question.name, field.name)}.${interaction.user.id}`
                        }
                    ] });
            }
            return {
                title:    question.question,
                components,
                customID: `${QuestionHandler.getQuestionID(interaction.guildID, question.name)}.${interaction.user.id}`
            } satisfies ModalData as never;
        }
    }
}
