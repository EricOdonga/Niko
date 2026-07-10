const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
        
        const response = await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        console.log("STATUS:", response.status());
        
        const homepageDisplay = await page.evaluate(() => {
            const el = document.getElementById('homepage');
            return el ? el.style.display : 'NOT FOUND';
        });
        
        console.log("HOMEPAGE DISPLAY:", homepageDisplay);
        
        await browser.close();
    } catch (e) {
        console.error("Puppeteer script failed:", e);
    }
})();
