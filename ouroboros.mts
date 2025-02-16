import path from 'path';
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`${path.resolve('./docs/index.html')}`);
await page.exposeFunction('sendDataToNode', (data) => {
    console.log('Received from page:', data);



});