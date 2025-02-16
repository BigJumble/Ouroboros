import path from 'path';
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
// Log the file path to debug
const filePath = path.resolve('./docs/index.html');
console.log('Navigating to:', `file://${filePath}`);

await page.goto(`file://${filePath}`);
await page.exposeFunction('sendDataToNode', (data) => {
    console.log('Received from page:', data);



});