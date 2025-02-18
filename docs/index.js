import { MyConnections } from "./main.js";
import { Database } from "./database.js";
window.Database = Database;
window.MyConnections = MyConnections;
MyConnections.init();
