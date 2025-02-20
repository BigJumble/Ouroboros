export class Database {
    static messages = [];
    static store(message) {
        this.messages.push({ ...message, date: new Date().getTime() });
    }
    static restore(data) {
        this.messages = [...data, ...this.messages];
    }
    static getLatest() {
        return JSON.stringify(this.messages[this.messages.length - 1]);
    }
    static get(num) {
        const start = Math.max(0, this.messages.length - num - 5);
        const end = Math.max(0, this.messages.length - num);
        return JSON.stringify(this.messages.slice(start, end).reverse());
    }
}
