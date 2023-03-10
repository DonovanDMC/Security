/// <reference lib="dom" />
// referencing dom for global fetch

import Config from "../config/index.js";

export default class Welcome {
    static async run(guild: string, member: string, type: "join" | "leave", force: boolean) {
        return fetch(`https://api.maid.gay/welcome/${guild}/${member}/${type}?force=${String(force)}`, {
            method:  "PUT",
            headers: {
                Authorization: Config.welcomeAuth
            }
        }).then(res => res.status === 201);
    }
}
