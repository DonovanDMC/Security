import QuestionHandler from "./QuestionHandler.js";
import type { ButtonQuestion, SelectQuestion } from "../types";
import {
    ComponentTypes,
    type InteractionContent,
    type GuildCommandInteraction,
    type MessageActionRow,
    MessageFlags,
    type GuildComponentInteraction
} from "oceanic.js";
import chunk from "chunk";

export function buildQuestion(interaction: GuildCommandInteraction | GuildComponentInteraction, question: SelectQuestion | ButtonQuestion) {
    switch (question.choiceType) {
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
            } satisfies InteractionContent;
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
            } satisfies InteractionContent;
        }
    }
}
