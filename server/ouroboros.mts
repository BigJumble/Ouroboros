import path from 'path';
import puppeteer from 'puppeteer';

// import { validateJSON } from '../src/validator.mts';
// import { type Message, MessageExample } from '../src/types.mts';
import chalk from 'chalk';

// import {MyConnections} from "../src/main.ts";

// declare global {
//     interface Window {
//         MyConnections: typeof MyConnections;
//     }
// }
// FOR TS
class MyConnections {
    static init(nodeID: number) { };
}

const main = async () => {

    const browser = await puppeteer.launch({
        headless: !!process.env.HEADLESS ? true : false,
        browser: "firefox",
        args: [
            '--no-sandbox',
            // '--disable-setuid-sandbox',
            // '--disable-web-security',
            // '--use-fake-ui-for-media-stream',
            // '--use-fake-device-for-media-stream'
        ]
    });
    const page = await browser.newPage();

    const filePath = path.resolve('./puppet/index.html');
    console.log(chalk.gray('Navigating to:', `file://${filePath}`));
    await page.goto(`file://${filePath}`);


    await page.exposeFunction('logToTerminal', logToTerminal);
    async function logToTerminal(text: string) {
        console.log(text);
    }

    await page.exposeFunction('startPages', startPages);
    async function startPages(payload: string) {
        console.log(chalk.gray('Sending payload to GitHub Pages...'));
        const curl = `curl -X POST -H "Accept: application/vnd.github+json" -H "Authorization: Bearer ${process.env.RUN}" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/dispatches -d '{"event_type":"trigger_static"}'`;
        
        // console.log(process.env.GITHUB_REPOSITORY);
        const { exec } = await import('child_process');
        exec(curl, (error, stdout, stderr) => {
            if (error) {
                console.log(chalk.red(`Error: ${error}`));
                return;
            }
            if (stderr) {
                console.log(chalk.yellow(`stderr: ${stderr}`));
                return;
            }
            console.log(chalk.green(`Successfully sent payload: ${stdout}`));
        });
    }


    await page.exposeFunction('killmyself', killmyself);
    async function killmyself() {
        await page.close();
        await browser.close();
        process.exit(0);
    }

    try {
        await page.evaluate((id) => {
            MyConnections.init(Number(id));
        }, !!process.env.NODEID ? process.env.NODEID : 0);
    } catch (error) {
        console.log(error);
    }

    // await page.exposeFunction('sendDataToNode', receivedDataFromUser);
    // // console.log(page);
    // async function receivedDataFromUser(peerid:string, data:string) {
    //     // console.log(chalk.green(`Received from ${peerid}:`, data));
    //     const parsed = validateJSON<Message>(data, MessageExample);
    //     if (parsed.success === false) {
    //         console.log(chalk.yellow(parsed.error));
    //         return;
    //     }
    //     console.log(chalk.green(`Received from ${peerid}:`, data));

    //     // console.log(chalk.green(parsed.data));

    //     try {
    //         await page.evaluate((peerid) => {
    //             MyConnections.send(peerid,`I have obtained your message Mr. ${peerid}`);
    //         }, peerid);
    //     } catch(error)
    //     {
    //         console.log(error);
    //     }
    // }

};

await main();