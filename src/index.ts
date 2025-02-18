import { MyConnections } from "./main.js";

declare global {
    interface Window {
        MyConnections: typeof MyConnections;
    }
}

window.MyConnections = MyConnections;

MyConnections.init();