import path from 'path';
import puppeteer from 'puppeteer';



const main = async () => {

    const browser = await puppeteer.launch({
        headless: !!process.env.HEADLESS ? true : false,
        browser: "firefox",
        args: [
            '--no-sandbox',
            // '--disable-http-cache',
            // '--disable-setuid-sandbox',
            // '--disable-web-security',
            // '--use-fake-ui-for-media-stream',
            // '--use-fake-device-for-media-stream'
        ]
    });
    const page = await browser.newPage();

    // const filePath = path.resolve('./dist/index.html');
    // console.log('Navigating to:', `file://${filePath}`);
    // await page.goto(`file://${filePath}`);

    const filePath = path.resolve('./dist/bundle.js');
    // console.log('Evaluating:', filePath);
    await page.addScriptTag({
        path: filePath
    });


    await page.exposeFunction('logToTerminal', logToTerminal);
    async function logToTerminal(text: string) {
        const date = new Date();
        console.log(`${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`, text);        
        return;
    }

    await page.exposeFunction('startPages', startPages);
    async function startPages(payload: string) {
        console.log('Sending payload to GitHub Pages...');
        try {
            const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/dispatches`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/vnd.github+json',
                    'Authorization': `Bearer ${process.env.RUN}`,
                    'X-GitHub-Api-Version': '2022-11-28'
                },
                body: JSON.stringify({
                    event_type: 'trigger_static',
                    client_payload: JSON.parse(payload)
                })
            });

            if (response.ok) {
                console.log('Successfully sent payload');
            } else {
                console.log(`Error: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.log(`Error: ${error}`);
        }
    }

    await page.exposeFunction('getNodes', getNodes);
    async function getNodes() {
        const response = await fetch('https://bigjumble.github.io/Ouroboros/nodes.json', {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        const nodes = await response.json();
        // console.log(nodes);
        return nodes;
    }


    await page.exposeFunction('killmyself', killmyself);
    async function killmyself() {
        await page.close();
        await browser.close();
        process.exit(0);
    }

    try {
        await page.evaluate(`MyConnections.init();`);
    } catch (error) {
        console.log(error);
    }

    // trigger another runner to restart cycle
    const interval = setTimeout(async () => {
        try {
            const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/dispatches`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/vnd.github+json',
                    'Authorization': `Bearer ${process.env.RUN}`,
                    'X-GitHub-Api-Version': '2022-11-28'
                },
                body: JSON.stringify({
                    event_type: 'trigger_node'
                })
            });

            if (response.ok) {
                console.log('Successfully sent payload');
            } else {
                console.log(`Error: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.log(`Error: ${error}`);
        }
    }, 2 * 60 * 60 * 1000); // 2 hours, since at ~2.5h without connection there is webrtc error

    process.on('SIGINT', () => {
        clearInterval(interval);
        killmyself();
    });


};

await main();