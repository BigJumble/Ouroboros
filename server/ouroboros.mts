import path, { parse } from 'path';
import puppeteer from 'puppeteer';

import { validateJSON } from './validator.mts';
import { type Message, MessageExample } from './types.mts';
import chalk from 'chalk';

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
await page.exposeFunction('sendDataToNode', receivedDataFromUser);

function receivedDataFromUser(data) {
    console.log(chalk.green('Received from page:', data));
    const parsed = validateJSON<Message>(data, MessageExample);
    if (parsed.success === false) {
        // console.log(chalk.yellow(parsed.error));
        return;
    }
    console.log(chalk.green(parsed.data));
}

