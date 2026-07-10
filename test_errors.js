const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        let errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });
        page.on('pageerror', err => {
            errors.push(err.message);
        });
        
        await page.goto('http://localhost:3000/#canfield', { waitUntil: 'networkidle0' });
        
        console.log("ERRORS CAUGHT:", errors);
        
        await browser.close();
    } catch (e) {
        console.error("Puppeteer script failed:", e);
    }
})();
