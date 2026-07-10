const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        await page.goto('http://localhost:3000/#yukon', { waitUntil: 'networkidle0' });
        
        const cardCount = await page.evaluate(() => {
            return document.querySelectorAll('#tableHolder .card').length;
        });
        const pileCount = await page.evaluate(() => {
            return document.querySelectorAll('#tableHolder .pile').length;
        });
        
        console.log("CARDS RENDERED:", cardCount);
        console.log("PILES RENDERED:", pileCount);
        
        await browser.close();
    } catch (e) {
        console.error("Puppeteer script failed:", e);
    }
})();
