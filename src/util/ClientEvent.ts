import type Security from "../main";
import type { ClientEvents } from "oceanic.js";

export default class ClientEvent<K extends keyof ClientEvents = keyof ClientEvents> {
    listener: (this: Security, ...args: ClientEvents[K]) => void;
    name: K;
    constructor(event: K, listener: (this: Security, ...args: ClientEvents[K]) => void) {
        this.name = event;
        this.listener = listener;
    }
}
