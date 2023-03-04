export interface BaseQuestion {
    choiceType: "select" | "button";
    choices: Array<SelectChoice | ButtonChoice>;
    condition: Record<string, string> | null;
    name: string;
    question: string;
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
    choices: Array<SelectChoice>;
    multiSelect: boolean | number;
}

export type Root = Record<string, ServerConfig>;
interface ServerConfig {
    blockedRoles: Array<string>;
    disallowDuplicateRegistration: boolean;
    logsChannel: string;
    questions: Array<SelectQuestion | ButtonQuestion>;
    successfulRegistrationRole: string | null;
}

export interface HashedQuestion {
    choices: Record<string, string>;
    guild: string;
    hash: string;
    name: string;
}
