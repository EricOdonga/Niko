const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'], defaultViewport: {width: 1200, height: 800} });
        const page = await browser.newPage();
        
        await page.goto('http://localhost:3000/#canfield', { waitUntil: 'networkidle0' });
        
        const gameContainerDisplay = await page.evaluate(() => document.getElementById('game-container').style.display);
        const tableHolderHTML = await page.evaluate(() => document.getElementById('tableHolder').innerHTML);
        
        console.log("GAME CONTAINER DISPLAY:", gameContainerDisplay);
        console.log("TABLE HOLDER LENGTH:", tableHolderHTML.length);
        
        await browser.close();
    } catch (e) {
        console.error("Puppeteer script failed:", e);
    }
})();
