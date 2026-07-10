const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
        
        const response = await page.goto('https://ais-dev-zdolqlxajgz6erpjxskcdb-125657057543.europe-west2.run.app', { waitUntil: 'networkidle0' });
        console.log("STATUS:", response.status());
        
        const bodyHTML = await page.evaluate(() => document.body.innerHTML);
        console.log("BODY LENGTH:", bodyHTML.length);
        
        await browser.close();
    } catch (e) {
        console.error("Puppeteer script failed:", e);
    }
})();
