import type { Message, MetaMessage } from "./types.mts";
export class Database{

    static messages: MetaMessage[] = [];
    static store(message: Message)
    {
        this.messages.push({...message, date:new Date().getTime()});
    }
    static getLatest()
    {
        return JSON.stringify(this.messages[this.messages.length-1]);
    }
    static get(num:number)
    {
        const start = Math.max(0, this.messages.length - num - 5);
        const end = Math.max(0, this.messages.length - num);
        return JSON.stringify(this.messages.slice(start, end).reverse());
    }
} 