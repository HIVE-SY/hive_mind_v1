const puppeteer = require("puppeteer");
const path = require("path");
require("dotenv").config();
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();

const bucketName = 'run-sources-enduring-smile-378219-us-central1';

async function uploadScreenshot(localPath, gcsDest) {
  await storage.bucket(bucketName).upload(localPath, {
    destination: gcsDest,
    public: false // or true if you want to access via public link
  });
  console.log(`Screenshot uploaded: gs://${bucketName}/${gcsDest}`);
}

// Add global error handlers
process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
  // Don't crash the process
});

process.on('unhandledRejection', (error) => {
  console.error('⚠️ Unhandled Rejection:', error);
  // Don't crash the process
});

/**
 * Join a Google Meet meeting
 * @param {string} meetingUrl The URL of the meeting to join
 * @param {number} maxRetries Maximum number of retry attempts (default: 3)
 * @param {number} retryDelay Delay between retries in milliseconds (default: 5000)
 */
async function joinMeet(meetingUrl, maxRetries = 3, retryDelay = 5000) {
  console.log('🤖 Using bot\'s Chrome profile at:', path.join(__dirname, 'bot-profile'));
  
  let browser;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    console.log(`\n🔄 Attempt ${attempt} of ${maxRetries} to join meeting...`);
    
    try {
      browser = await puppeteer.launch({
        headless: "new",
        userDataDir: path.join(__dirname, 'bot-profile'),
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
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: null
      });

      // Add error handler for browser
      browser.on('disconnected', () => {
        console.log('⚠️ Browser disconnected');
      });

      const page = await browser.newPage();
      
      // Set user agent to look like a regular Chrome browser
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      
      // Set extra headers to look more like a regular browser
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

      // Handle page errors and crashes
      page.on('error', err => {
        console.error('❌ Page error:', err);
      });

      page.on('pageerror', err => {
        console.error('❌ Page error:', err);
      });

      console.log('🌐 Navigating to meeting:', meetingUrl);
      await page.goto(meetingUrl, { 
        waitUntil: 'networkidle0',
        timeout: 60000 
      });

      // Wait for the page to fully load
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      //Take sc to full load page
      await page.screenshot({ path: '/tmp/meet_debug_full_load.png' });
      await uploadScreenshot('/tmp/meet_debug_full_load.png', 'meet-debug/meet_debug_full_load.png');


      // Handle name input if present
      try {
        console.log('🔍 Looking for name input...');
        await page.waitForSelector('input[aria-label="Your name"]', { timeout: 10000 });
        console.log('✅ Found name input, entering bot name...');
        
        // Clear any existing text first
        await page.evaluate(() => {
          const input = document.querySelector('input[aria-label="Your name"]');
          if (input) {
            input.value = '';
          }
        });
        
        // Type the name without pressing Enter
        await page.type('input[aria-label="Your name"]', '🤖 Hive Mind AI');
        
        // Click outside the input to ensure it's saved
        await page.mouse.click(100, 100);
        
        // Wait for the name to be set
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify the name was set
        const nameValue = await page.evaluate(() => {
          const input = document.querySelector('input[aria-label="Your name"]');
          return input ? input.value : '';
        });
        
        if (nameValue !== '🤖 Meeting Bot') {
          console.log('⚠️ Name not set correctly, trying again...');
          await page.type('input[aria-label="Your name"]', '🤖 Meeting Bot');
          await page.mouse.click(100, 100);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('✅ Name set successfully');
        //sc after name input
        await page.screenshot({ path: '/tmp/meet_debug_after_nameinput.png' });
        await uploadScreenshot('/tmp/meet_debug_after_nameinput.png', 'meet-debug/meet_debug_after_nameinput.png');

      } catch (error) {
        console.log('⚠️ No name input found, might be already set');
      }

      // Wait for the join button and click it
      try {
        console.log('🔍 Looking for join button...');
        
        // Wait for the page to be fully loaded
        await page.waitForFunction(() => {
          return document.readyState === 'complete';
        }, { timeout: 10000 });
        
        // Log all buttons on the page for debugging
        const allButtons = await page.$$('button');
        console.log(`Found ${allButtons.length} total buttons on the page`);
        
        for (const button of allButtons) {
          const text = await page.evaluate(el => el.textContent.toLowerCase(), button);
          const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label')?.toLowerCase() || '', button);
          const jsname = await page.evaluate(el => el.getAttribute('jsname') || '', button);
          console.log(`Button found - text: "${text}", aria-label: "${ariaLabel}", jsname: "${jsname}"`);
        }
        
        // Try the original selector first
        const buttonSelector = 'button[jsname="Qx7uuf"]';
        console.log(`Trying selector: ${buttonSelector}`);
        
        try {
          await page.waitForSelector(buttonSelector, { timeout: 10000 });
          const elements = await page.$$(buttonSelector);
          console.log(`Found ${elements.length} elements with selector ${buttonSelector}`);
          
          let joinButton = null;
          for (const element of elements) {
            const text = await page.evaluate(el => el.textContent.toLowerCase(), element);
            const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label')?.toLowerCase() || '', element);
            
            console.log(`Element text: "${text}", aria-label: "${ariaLabel}"`);
            
            if (text.includes('ask to join') || text.includes('solicitar') || 
                ariaLabel.includes('ask to join') || ariaLabel.includes('solicitar')) {
              joinButton = element;
              console.log(`✅ Found "Ask to join" button`);
              break;
            }
          }
          
          if (joinButton) {
            console.log('Clicking "Ask to join" button...');
            await joinButton.click();
            await new Promise(resolve => setTimeout(resolve, 5000));
          } else {
            throw new Error('Join button not found with expected text');
          }
        } catch (error) {
          console.log(`Selector ${buttonSelector} not found, trying fallback...`);
          
          // Fallback: Try to find any button with the text
          console.log('Trying to find button by text content...');
          for (const button of allButtons) {
            const text = await page.evaluate(el => el.textContent.toLowerCase(), button);
            const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label')?.toLowerCase() || '', button);
            
            if (text.includes('ask to join') || text.includes('solicitar') || 
                ariaLabel.includes('ask to join') || ariaLabel.includes('solicitar')) {
              console.log(`✅ Found "Ask to join" button by text content`);
              await button.click();
              await new Promise(resolve => setTimeout(resolve, 5000));
              break;
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Could not find the join button:', error.message);
        if (attempt < maxRetries) {
          console.log(`⏳ Retrying in ${retryDelay/1000} seconds...`);
          await browser.close();
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        throw new Error('Failed to find join button after all retries');
      }

      // Function to ensure media settings
      async function ensureMediaSettings() {
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
            // Check if mic is currently unmuted before clicking
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

      // Set initial media settings
      await ensureMediaSettings();

      // Keep checking media settings
      setInterval(ensureMediaSettings, 5000);

      console.log('✅ Successfully joined the meeting');
      return true;

    } catch (error) {
      console.error(`❌ Error on attempt ${attempt}:`, error.message);
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('⚠️ Error closing browser:', closeError);
        }
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

// If this file is run directly, use the MEET_URL from environment variables
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
  joinMeet
}; 