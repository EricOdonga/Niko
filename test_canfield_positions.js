const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        await page.goto('http://localhost:3000/#canfield', { waitUntil: 'networkidle0' });
        
        const pilePositions = await page.evaluate(() => {
            const piles = document.querySelectorAll('#tableHolder .pile');
            return Array.from(piles).map(p => {
                return {
                    left: p.style.left,
                    top: p.style.top
                };
            });
        });
        
        console.log("PILE POSITIONS:");
        console.dir(pilePositions);
        
        await browser.close();
    } catch (e) {
        console.error("Puppeteer script failed:", e);
    }
})();
