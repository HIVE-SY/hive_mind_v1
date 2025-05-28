const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');

router.post('/join', async (req, res) => {
  const { meetingLink } = req.body;
  if (!meetingLink) {
    return res.status(400).json({ error: 'Meeting link is required' });
  }

  try {
    const browser = await puppeteer.launch({
      headless: false, // Switch to true after testing login works
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      userDataDir: './puppeteer/bot-profile',
      args: [
        '--use-fake-ui-for-media-stream',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-size=1280,720',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();
    await page.goto(meetingLink, { waitUntil: 'networkidle2', timeout: 60000 });

    // Check if login is required
    let pageContent = await page.content();
    if (page.url().includes('accounts.google.com') || pageContent.includes('Sign in')) {
      console.error('❌ Bot is not logged into Google. Please log in manually in the opened Chrome window.');
      console.log('⏳ Waiting 2 minutes for manual login...');
      await new Promise(resolve => setTimeout(resolve, 120000)); // 2-minute pause

      // Re-check after waiting
      const refreshedUrl = page.url();
      const refreshedContent = await page.content();
      if (refreshedUrl.includes('accounts.google.com') || refreshedContent.includes('Sign in')) {
        console.error('❌ Still not logged in. Exiting...');
        await browser.close();
        return res.status(401).json({ error: 'Login not completed in time' });
      }
    }

    console.log('✅ Bot loaded the meeting page');
    await new Promise(resolve => setTimeout(resolve, 5000)); // give time for full UI render

    // Mute mic
    try {
      await page.keyboard.down('Control');
      await page.keyboard.press('E');
      await page.keyboard.up('Control');
      console.log('🎙️ Mic muted');
    } catch (e) {
      console.warn('⚠️ Mic mute failed:', e.message);
    }

    // Turn off camera
    try {
      await page.keyboard.down('Control');
      await page.keyboard.press('D');
      await page.keyboard.up('Control');
      console.log('📷 Camera turned off');
    } catch (e) {
      console.warn('⚠️ Camera toggle failed:', e.message);
    }

    // Click the Join or Ask to Join button using bounding box + real click
    try {
      let clicked = false;
      const joinSelectors = [
        'button[jsname="Qx7uuf"]',
        'div[jsname="Qx7uuf"]',
        'button[aria-label*="join"]',
        'button[aria-label*="ask"]',
        'div[role="button"][aria-label*="join"]',
        'div[role="button"][aria-label*="ask"]',
        'button[data-tooltip*="join"]',
        'button[data-tooltip*="ask"]',
        'button:has-text("Join now")',
        'button:has-text("Ask to join")',
      ];

      for (let i = 0; i < 15 && !clicked; i++) {
        for (const selector of joinSelectors) {
          const button = await page.$(selector);
          if (button) {
            const box = await button.boundingBox();
            if (box) {
              await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
              clicked = true;
              break;
            }
          }
        }

        if (!clicked) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // retry after 1s
        }
      }

      if (clicked) {
        console.log('🚪 Clicked the Join or Ask button successfully');
        console.log('✅ Bot has joined the meeting!');
      } else {
        const html = await page.content();
        console.warn('⚠️ Could not find the Join button. Page HTML:', html.substring(0, 1000));
      }
    } catch (e) {
      console.error('❌ Failed to click Join button:', e.message);
    }

    // Stay in the meeting for 10 minutes
    await new Promise(resolve => setTimeout(resolve, 600000));
    await browser.close();

    res.status(200).json({ message: 'Bot attempted to join the meeting' });
  } catch (error) {
    console.error('❌ Error joining meeting:', error);
    res.status(500).json({ error: 'Failed to join meeting' });
  }
});

module.exports = router;
