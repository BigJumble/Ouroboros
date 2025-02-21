import { MyConnections } from "./main";
import { Database } from "./database";

declare global {
    interface Window {
        MyConnections: typeof MyConnections;
        Database:typeof Database;
    }
}
window.Database = Database;
window.MyConnections = MyConnections;

// MyConnections.init(0);