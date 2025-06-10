const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer-extra');
const path = require('path');
require('dotenv').config();
const { Storage } = require('@google-cloud/storage');

const masterProfilePath = path.join(__dirname, 'bot-profile');
const storage = new Storage();
const bucketName = 'run-sources-enduring-smile-378219-us-central1';

// Add global error handlers
process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('⚠️ Unhandled Rejection:', error);
});

async function uploadScreenshot(localPath, gcsDest) {
  await storage.bucket(bucketName).upload(localPath, {
    destination: gcsDest,
    public: false
  });
  console.log(`Screenshot uploaded: gs://${bucketName}/${gcsDest}`);
}

async function launchBotForMeeting(meetingUrl) {
  const sessionProfilePath = `/tmp/bot-profile-${uuidv4()}`;
  fs.copySync(masterProfilePath, sessionProfilePath);

  const browser = await puppeteer.launch({
    headless: 'new',
    userDataDir: sessionProfilePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security'
    ],
    ignoreDefaultArgs: ['--enable-automation'],
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    });

    return { browser, page, sessionProfilePath };
  } catch (err) {
    await browser.close();
    fs.removeSync(sessionProfilePath);
    throw err;
  }
}

async function cleanupProfile(sessionProfilePath) {
  try {
    fs.removeSync(sessionProfilePath);
    console.log(`🧹 Cleaned up temp profile: ${sessionProfilePath}`);
  } catch (e) {
    console.log('⚠️ Failed to clean up temp profile:', e);
  }
}

async function handleNameInput(page) {
  try {
    console.log('🔍 Looking for name input...');
    await page.waitForSelector('input[aria-label="Your name"]', { timeout: 10000 });
    console.log('✅ Found name input, entering bot name...');
    
    await page.evaluate(() => {
      const input = document.querySelector('input[aria-label="Your name"]');
      if (input) input.value = '';
    });
    
    await page.type('input[aria-label="Your name"]', '🤖 Hive Mind AI');
    await page.mouse.click(100, 100);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const nameValue = await page.evaluate(() => {
      const input = document.querySelector('input[aria-label="Your name"]');
      return input ? input.value : '';
    });
    
    if (nameValue !== '🤖 Hive Mind AI') {
      await page.type('input[aria-label="Your name"]', '🤖 Hive Mind AI');
      await page.mouse.click(100, 100);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('✅ Name set successfully');
    await page.screenshot({ path: '/tmp/meet_debug_after_nameinput.png' });
    await uploadScreenshot('/tmp/meet_debug_after_nameinput.png', 'meet-debug/meet_debug_after_nameinput.png');
  } catch (error) {
    console.log('⚠️ No name input found, might be already set');
  }
}

async function handleJoinButton(page) {
  console.log('🔍 Looking for join button...');
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
  
  const allButtons = await page.$$('button');
  console.log(`Found ${allButtons.length} total buttons on the page`);
  
  const buttonSelector = 'button[jsname="Qx7uuf"]';
  try {
    await page.waitForSelector(buttonSelector, { timeout: 10000 });
    const elements = await page.$$(buttonSelector);
    
    for (const element of elements) {
      const text = await page.evaluate(el => el.textContent.toLowerCase(), element);
      const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label')?.toLowerCase() || '', element);
      
      if (text.includes('ask to join') || text.includes('solicitar') || 
          ariaLabel.includes('ask to join') || ariaLabel.includes('solicitar')) {
        console.log('✅ Found "Ask to join" button');
        await element.click();
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verify we're actually in the meeting
        try {
          const inMeetingSelector = 'div[aria-label*="You\'re in the meeting"]';
          await page.waitForSelector(inMeetingSelector, { timeout: 15000 });
          console.log('✅ Successfully verified we are in the meeting');
          return true;
        } catch (error) {
          console.log('⚠️ Could not verify we are in the meeting');
          await page.screenshot({ path: '/tmp/not_joined.png' });
          await uploadScreenshot('/tmp/not_joined.png', 'meet-debug/not_joined.png');
          return false;
        }
      }
    }
  } catch (error) {
    console.log(`Selector ${buttonSelector} not found, trying fallback...`);
    for (const button of allButtons) {
      const text = await page.evaluate(el => el.textContent.toLowerCase(), button);
      const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label')?.toLowerCase() || '', button);
      
      if (text.includes('ask to join') || text.includes('solicitar') || 
          ariaLabel.includes('ask to join') || ariaLabel.includes('solicitar')) {
        console.log('✅ Found "Ask to join" button by text content');
        await button.click();
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verify we're actually in the meeting
        try {
          const inMeetingSelector = 'div[aria-label*="You\'re in the meeting"]';
          await page.waitForSelector(inMeetingSelector, { timeout: 15000 });
          console.log('✅ Successfully verified we are in the meeting');
          return true;
        } catch (error) {
          console.log('⚠️ Could not verify we are in the meeting');
          await page.screenshot({ path: '/tmp/not_joined.png' });
          await uploadScreenshot('/tmp/not_joined.png', 'meet-debug/not_joined.png');
          return false;
        }
      }
    }
  }
  return false;
}

async function ensureMediaSettings(page) {
  try {
    const allButtons = await page.$$('button');
    let micButton = null;
    
    for (const button of allButtons) {
      const text = await page.evaluate(el => el.textContent.toLowerCase(), button);
      const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label')?.toLowerCase() || '', button);
      
      if (text.includes('mic') || ariaLabel.includes('mic') || ariaLabel.includes('microphone')) {
        micButton = button;
        break;
      }
    }

    if (micButton) {
      const isUnmuted = await page.evaluate(button => {
        const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
        const dataIsMuted = button.getAttribute('data-is-muted');
        return ariaLabel.includes('unmuted') || ariaLabel.includes('on') || dataIsMuted === 'false';
      }, micButton);

      if (isUnmuted) {
        console.log('🎙️ Mic is unmuted, muting...');
        await micButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.log('⚠️ Error setting media:', error.message);
  }
}

async function joinMeet(meetingUrl, maxRetries = 3, retryDelay = 5000) {
  let attempt = 0;
  let sessionProfilePath;

  while (attempt < maxRetries) {
    attempt++;
    console.log(`\n🔄 Attempt ${attempt} of ${maxRetries} to join meeting...`);
    
    try {
      const { browser, page, sessionProfilePath: newProfilePath } = await launchBotForMeeting(meetingUrl);
      sessionProfilePath = newProfilePath;

      console.log('🌐 Navigating to meeting:', meetingUrl);
      await page.goto(meetingUrl, { waitUntil: 'networkidle0', timeout: 60000 });
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await page.screenshot({ path: '/tmp/meet_debug_full_load.png' });
      await uploadScreenshot('/tmp/meet_debug_full_load.png', 'meet-debug/meet_debug_full_load.png');

      await handleNameInput(page);
      
      const joined = await handleJoinButton(page);
      if (!joined) {
        throw new Error('Failed to find join button');
      }

      await ensureMediaSettings(page);
      setInterval(() => ensureMediaSettings(page), 5000);

      console.log('✅ Successfully joined the meeting');
      return { browser, page, sessionProfilePath };

    } catch (error) {
      console.error(`❌ Error on attempt ${attempt}:`, error.message);
      if (sessionProfilePath) {
        await cleanupProfile(sessionProfilePath);
      }
      
      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${retryDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('❌ Max retries reached, giving up');
        return false;
      }
    }
  }
  return false;
}

if (require.main === module) {
  const meetUrl = process.env.MEET_URL;
  if (!meetUrl) {
    console.error("❌ No MEET_URL provided in environment variables");
    process.exit(1);
  } 
  joinMeet(meetUrl).catch(error => {
    console.error('❌ Error joining meeting:', error);
    process.exit(1);
  });
}

module.exports = {
  joinMeet,
  cleanupProfile
}; 