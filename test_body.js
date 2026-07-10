const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        await page.goto('https://ais-dev-zdolqlxajgz6erpjxskcdb-125657057543.europe-west2.run.app', { waitUntil: 'networkidle0' });
        
        const bodyHTML = await page.evaluate(() => document.body.innerHTML);
        console.log("BODY HTML:", bodyHTML.substring(0, 500));
        
        await browser.close();
    } catch (e) {
        console.error("Puppeteer script failed:", e);
    }
})();
