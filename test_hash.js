const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
        
        await page.goto('http://localhost:3000/#yukon', { waitUntil: 'networkidle0' });
        
        const isGameVisible = await page.evaluate(() => {
            const el = document.getElementById('game-container');
            return el ? el.style.display : 'NOT FOUND';
        });
        
        console.log("GAME CONTAINER DISPLAY:", isGameVisible);
        
        await browser.close();
    } catch (e) {
        console.error("Puppeteer script failed:", e);
    }
})();
