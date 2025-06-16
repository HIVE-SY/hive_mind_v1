const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
puppeteer.use(StealthPlugin());

(async () => {
  // 1. Launch with authenticated profile
  const userDataDir = './meeting/bot-profile';
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir);

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1280,720',
      `--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36`
    ]
  });

  // 2. Configure page
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'navigate'
  });

  // 3. Block analytics requests
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (
      req.url().includes('google.com/log') ||
      req.url().includes('doubleclick.net') ||
      req.url().includes('google-analytics.com')
    ) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // 4. Navigate and join meeting
  try {
    console.log('🌐 Loading Meet homepage...');
    await page.goto('https://meet.google.com', { waitUntil: 'networkidle2', timeout: 60000 });

    // Manual intervention point
    console.log('👉 Please MANUALLY enter meeting code and join');
    console.log('👉 The browser will remain open for inspection');

    // Keep alive
    await new Promise(() => {});
  } catch (error) {
    console.error('❌ Error:', error);
    await browser.close();
  }
})();