import { MyConnections } from "./main.js";
import { Database } from "./database.js";

declare global {
    interface Window {
        MyConnections: typeof MyConnections;
        Database:typeof Database;
    }
}
window.Database = Database;
window.MyConnections = MyConnections;

// MyConnections.init(0);