const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        let errs = [];
        page.on('console', msg => { if (msg.type() === 'error') errs.push(msg.text()); });
        page.on('pageerror', err => errs.push(err.message));

        await page.goto('http://localhost:3000/#yukon', { waitUntil: 'networkidle0' });
        
        const cardCount = await page.evaluate(() => document.querySelectorAll('#tableHolder .card').length);
        const pileCount = await page.evaluate(() => document.querySelectorAll('#tableHolder .pile').length);
        
        console.log("YUKON CARDS RENDERED:", cardCount);
        console.log("YUKON PILES RENDERED:", pileCount);
        console.log("YUKON ERRORS:", errs);
        
        await browser.close();
    } catch (e) {
        console.error("Puppeteer script failed:", e);
    }
})();
