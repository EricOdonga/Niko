const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        await page.goto('http://localhost:3000/#canfield', { waitUntil: 'networkidle0' });
        
        const cardCount = await page.evaluate(() => document.querySelectorAll('#tableHolder .card').length);
        const pileCount = await page.evaluate(() => document.querySelectorAll('#tableHolder .pile').length);
        
        console.log("CANFIELD CARDS RENDERED:", cardCount);
        console.log("CANFIELD PILES RENDERED:", pileCount);
        
        await browser.close();
    } catch (e) {
        console.error("Puppeteer script failed:", e);
    }
})();
