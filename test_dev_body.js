const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        await page.goto('https://ais-dev-zdolqlxajgz6erpjxskcdb-125657057543.europe-west2.run.app', { waitUntil: 'networkidle0' });
        
        const homepageDisplay = await page.evaluate(() => {
            const el = document.getElementById('homepage');
            return el ? el.style.display : 'NOT FOUND';
        });
        
        console.log("HOMEPAGE DISPLAY:", homepageDisplay);
        
        const errs = await page.evaluate(() => {
            return window.__errors || [];
        });
        console.log("ERRORS:", errs);

        await browser.close();
    } catch (e) {
        console.error("Puppeteer script failed:", e);
    }
})();
