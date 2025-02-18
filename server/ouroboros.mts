import path, { parse } from 'path';
import puppeteer from 'puppeteer';

import { validateJSON } from './validator.mts';
import { type Message, MessageExample } from './types.mts';
import chalk from 'chalk';
 
import {MyConnections} from "../src/main.ts";

declare global {
    interface Window {
        MyConnections: typeof MyConnections;
    }
}

const browser = await puppeteer.launch({
    headless: !!process.env.HEADLESS?true:false,
    browser:"firefox",
    args: [
        '--no-sandbox',
        // '--disable-setuid-sandbox',
        // '--disable-web-security',
        // '--use-fake-ui-for-media-stream',
        // '--use-fake-device-for-media-stream'
    ]
});
const page = await browser.newPage();

const filePath = path.resolve('./docs/index.html');
console.log(chalk.gray ('Navigating to:', `file://${filePath}`));
await page.goto(`file://${filePath}`);

// Add PeerJS script
// await page.addScriptTag({
//     url: 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'
// });

// // Inject main.js script
// await page.addScriptTag({
//     path: path.resolve('./docs/main.js')
// });



// try {
//     await page.evaluate(() => {
//         MyConnections.init();
//     }, );
// } catch(error)
// {
//     console.log(error);
// }




await page.exposeFunction('sendDataToNode', receivedDataFromUser);
// console.log(page);
async function receivedDataFromUser(peerid:string, data:string) {
    console.log(chalk.green(`Received from ${peerid}:`, data));
    const parsed = validateJSON<Message>(data, MessageExample);
    if (parsed.success === false) {
        console.log(chalk.yellow(parsed.error));
        return;
    }
    // console.log(chalk.green(parsed.data));

    try {
        await page.evaluate((peerid) => {
            MyConnections.send(peerid,`I have obtained your message Mr. ${peerid}`);
        }, peerid);
    } catch(error)
    {
        console.log(error);
    }
}

