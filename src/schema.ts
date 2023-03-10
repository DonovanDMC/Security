import { type Static, Type } from "@sinclair/typebox";
import Ajv from "ajv";

const ajv = new Ajv();

export const SelectChoiceSchema = Type.Object({
    name:  Type.String({ minLength: 1, maxLength: 100 }),
    roles: Type.Array(Type.String())
});
export type SelectChoice = Static<typeof SelectChoiceSchema>;

export const SelectQuestionSchema = Type.Object({
    choices:     Type.Array(SelectChoiceSchema),
    condition:   Type.Union([Type.Null(), Type.Unsafe<Record<string, string>>(Type.Object({}))]),
    multiSelect: Type.Union([Type.Boolean(), Type.Number()]),
    name:        Type.String(),
    question:    Type.String(),
    type:        Type.Literal("select")
});
export type SelectQuestion = Static<typeof SelectQuestionSchema>;

export const ButtonChoiceSchema = Type.Object({
    name:  Type.String({ minLength: 1, maxLength: 100 }),
    roles: Type.Array(Type.String()),
    style: Type.Union([Type.Literal(1), Type.Literal(2), Type.Literal(3), Type.Literal(4)])
});
export type ButtonChoice = Static<typeof ButtonChoiceSchema>;

export const ButtonQuestionSchema = Type.Object({
    choices:   Type.Array(ButtonChoiceSchema),
    condition: Type.Union([Type.Null(), Type.Unsafe<Record<string, string>>(Type.Object({}))]),
    name:      Type.String(),
    question:  Type.String(),
    type:      Type.Literal("button")
});
export type ButtonQuestion = Static<typeof ButtonQuestionSchema>;

export const InputFieldResultSchema = Type.Object({
    roles: Type.Array(Type.String()),
    type:  Type.Union([Type.Literal("lt"), Type.Literal("lte"), Type.Literal("gt"), Type.Literal("gte"), Type.Literal("eq"), Type.Literal("neq"), Type.Literal("regex")]),
    value: Type.String()
});
export type InputFieldResult = Static<typeof InputFieldResultSchema>;

export const InputFieldSchema = Type.Object({
    name:        Type.String(),
    parse:       Type.Union([Type.Null(), Type.Literal("number")]),
    placeholder: Type.Union([Type.Null(), Type.String()]),
    required:    Type.Boolean(),
    results:     Type.Array(InputFieldResultSchema),
    type:        Type.Union([Type.Literal("short"), Type.Literal("long")])
});
export type InputField = Static<typeof InputFieldSchema>;

export const InputQuestionSchema = Type.Object({
    condition: Type.Union([Type.Null(), Type.Record(Type.String(), Type.String())]),
    fields:    Type.Array(InputFieldSchema),
    name:      Type.String(),
    question:  Type.String({ maxLength: 45 }),
    type:      Type.Literal("input")
});
export type InputQuestion = Static<typeof InputQuestionSchema>;

export const WelcomeConfigSchema = Type.Object({
    force:         Type.Boolean(),
    requiredRoles: Type.Array(Type.String())
});
export type WelcomeConfig = Static<typeof WelcomeConfigSchema>;

export const ServerConfigSchema = Type.Object({
    blockedRoles:                  Type.Array(Type.String()),
    disallowDuplicateRegistration: Type.Boolean(),
    logsChannel:                   Type.Union([Type.Null(), Type.String()]),
    questions:                     Type.Array(Type.Union([SelectQuestionSchema, ButtonQuestionSchema, InputQuestionSchema])),
    successfulRegistrationRole:    Type.Union([Type.Null(), Type.String()]),
    welcome:                       Type.Union([Type.Null(), Type.Boolean(), WelcomeConfigSchema])
});
export type ServerConfig = Static<typeof ServerConfigSchema>;

export interface HashedQuestion {
    choices: Record<string, string>;
    fields: Record<string, string>;
    guild: string;
    hash: string;
    name: string;
}

export const RootSchema = Type.Record(Type.String(), ServerConfigSchema);
export type Root = Static<typeof RootSchema>;
export const validateServerConfig = ajv.compile(ServerConfigSchema);
