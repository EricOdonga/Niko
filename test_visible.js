const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        await page.goto('http://localhost:3000/#canfield', { waitUntil: 'networkidle0' });
        
        const topOfPile = await page.evaluate(() => {
            const el = document.querySelector('.pile');
            if (el) return el.style.top;
            return null;
        });
        
        console.log("TOP OF PILE:", topOfPile);
        
        await browser.close();
    } catch (e) {
        console.error("Puppeteer script failed:", e);
    }
})();
