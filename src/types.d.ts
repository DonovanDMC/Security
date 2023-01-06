export interface BaseQuestion {
    name: string;
    question: string;
    condition: Record<string, string> | null;
    choiceType: "select" | "button";
    choices: Array<SelectChoice | ButtonChoice>;
}

export interface SelectChoice {
    name: string;
    roles: Array<string>;
}

export interface ButtonChoice extends SelectChoice {
    style: number;
}

export interface ButtonQuestion extends BaseQuestion {
    choiceType: "button";
    choices: Array<ButtonChoice>;
}

export interface SelectQuestion extends BaseQuestion {
    choiceType: "select";
    multiSelect: boolean | number;
    choices: Array<SelectChoice>;
}

export type Root = Record<string, ServerConfig>;
interface ServerConfig {
    logsChannel: string;
    disallowDuplicateRegistration: boolean;
    successfulRegistrationRole: string | null;
    blockedRoles: Array<string>;
    questions: Array<SelectQuestion | ButtonQuestion>;
}

export interface HashedQuestion {
    guild: string;
    name: string;
    hash: string;
    choices: Record<string, string>;
}
