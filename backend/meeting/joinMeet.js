const puppeteer = require("puppeteer");
const path = require("path");
require("dotenv").config();

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
    headless: false,
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
          '--use-fake-ui-for-media-stream'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: null
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

      page.on('console', msg => {
        console.log('📝 Browser console:', msg.text());
      });

      console.log('🌐 Navigating to meeting:', meetingUrl);
      await page.goto(meetingUrl, { waitUntil: 'networkidle0' });

      // Wait for the page to fully load
      await new Promise(resolve => setTimeout(resolve, 5000));

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
        await page.type('input[aria-label="Your name"]', '🤖 Meeting Bot');
        
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
      } catch (error) {
        console.log('⚠️ No name input found, might be already set');
      }

      // Wait for the join button and click it
      try {
        console.log('🔍 Looking for join button...');
        
        // Try different selectors for the "Ask to join" button
        const buttonSelectors = [
          'button[jsname="Qx7uuf"] span.UywwFc-RLmnJb',  // Specific class for the button text
          'button[jsname="Qx7uuf"]',  // Generic button
          'button[aria-label="Ask to join"]',
          'button[aria-label="ask to join"]',
          'button[aria-label="Solicitar para unirse"]',
          'button[aria-label="solicitar para unirse"]'
        ];

        let joinButton = null;
        for (const selector of buttonSelectors) {
          try {
            console.log(`Trying selector: ${selector}`);
            
            // Wait for the element
            await page.waitForSelector(selector, { timeout: 5000 });
            
            // Get all matching elements
            const elements = await page.$$(selector);
            
            for (const element of elements) {
              // Get the text content
              const text = await page.evaluate(el => el.textContent.toLowerCase(), element);
              // Get the aria-label (if it's a button)
              const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label')?.toLowerCase() || '', element);
              // Get the parent button if this is a span
              const parentButton = await page.evaluate(el => {
                if (el.tagName.toLowerCase() === 'span') {
                  return el.closest('button');
                }
                return el;
              }, element);
              
              console.log(`Found element with text: "${text}", aria-label: "${ariaLabel}"`);
              
              if (text.includes('ask to join') || text.includes('solicitar') || 
                  ariaLabel.includes('ask to join') || ariaLabel.includes('solicitar')) {
                joinButton = parentButton;
                console.log(`✅ Found "Ask to join" button with selector: ${selector}`);
                break;
              }
            }
            
            if (joinButton) break;
          } catch (error) {
            console.log(`Selector ${selector} not found, trying next...`);
          }
        }

        if (!joinButton) {
          // Last resort: try to find any button with the text
          console.log('Trying to find button by text content...');
          const buttons = await page.$$('button');
          for (const button of buttons) {
            const text = await page.evaluate(el => el.textContent.toLowerCase(), button);
            const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label')?.toLowerCase() || '', button);
            
            if (text.includes('ask to join') || text.includes('solicitar') || 
                ariaLabel.includes('ask to join') || ariaLabel.includes('solicitar')) {
              joinButton = button;
              console.log('✅ Found "Ask to join" button by text content');
              break;
            }
          }
        }

        if (!joinButton) {
          throw new Error('Could not find "Ask to join" button');
        }

        console.log('Clicking "Ask to join" button...');
        await joinButton.click();
        
        // Wait for the page to update after clicking join
        await new Promise(resolve => setTimeout(resolve, 5000));
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

      // Check if we're in the waiting room
      try {
        console.log('🔍 Checking for waiting room...');
        
        const askToJoinButton = await page.$('button[jsname="Qx7uuf"]');
        if (askToJoinButton) {
          const buttonText = await page.evaluate(button => button.innerText.toLowerCase(), askToJoinButton);
          if (buttonText.includes('ask to join')) {
            console.log('🔘 Found "Ask to join" button, clicking...');
            await askToJoinButton.click();
            console.log('⏳ Waiting for host to admit...');
            
            await Promise.race([
              page.waitForFunction(() => {
                const text = document.body.innerText.toLowerCase();
                return !text.includes('waiting room') && 
                       !text.includes('waiting to join') &&
                       !text.includes('sala de espera') &&
                       !text.includes('solicitando ingreso');
              }, { timeout: 300000 }),
              
              page.waitForSelector('button[jsname="K4r5Ff"]', { timeout: 300000 })
            ]);
            
            console.log('✅ Admitted to meeting!');
          } else {
            console.log('✅ No waiting room detected, proceeding to meeting...');
          }
        } else {
          console.log('✅ No waiting room detected, proceeding to meeting...');
        }
      } catch (error) {
        console.log('⚠️ Could not check waiting room status:', error.message);
        if (attempt < maxRetries) {
          console.log(`⏳ Retrying in ${retryDelay/1000} seconds...`);
          await browser.close();
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        throw new Error('Failed to check waiting room status after all retries');
      }

      // Wait a bit for the meeting to load
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Function to ensure camera and mic settings
      async function ensureMediaSettings() {
        try {
          // Mute microphone
          const micButton = await page.$('button[jsname="K4r5Ff"]');
          if (micButton) {
            const micState = await page.evaluate(button => button.getAttribute('aria-label'), micButton);
            if (micState.includes('Turn on microphone')) {
              await micButton.click();
              console.log('🎙️ Mic muted');
            }
          }

          // Turn off camera
          const cameraButton = await page.$('button[jsname="BOHaEe"]');
          if (cameraButton) {
            const cameraState = await page.evaluate(button => button.getAttribute('aria-label'), cameraButton);
            if (cameraState.includes('Turn on camera')) {
              await cameraButton.click();
              console.log('📷 Camera off');
            }
          }
        } catch (error) {
          console.log('⚠️ Error setting media:', error.message);
        }
      }

      // Set initial media settings
      await ensureMediaSettings();

      // Set up periodic checks to ensure settings stay consistent
      const mediaCheckInterval = setInterval(async () => {
        await ensureMediaSettings();
      }, 10000); // Check every 10 seconds

      // Set up connection monitoring
      const connectionCheckInterval = setInterval(async () => {
        try {
          // Check if we're still in the meeting
          const isInMeeting = await page.evaluate(() => {
            return document.querySelector('button[jsname="K4r5Ff"]') !== null;
          });

          if (!isInMeeting) {
            console.log('⚠️ Lost connection to meeting, attempting to reconnect...');
            clearInterval(mediaCheckInterval);
            clearInterval(connectionCheckInterval);
            await browser.close();
            throw new Error('Lost connection to meeting');
          }
        } catch (error) {
          console.log('⚠️ Error checking connection:', error.message);
        }
      }, 5000); // Check every 5 seconds

      // Keep the browser open and handle cleanup
      process.on('SIGINT', async () => {
        console.log('\n🛑 Cleaning up...');
        clearInterval(mediaCheckInterval);
        clearInterval(connectionCheckInterval);
        await browser.close();
        process.exit(0);
      });

      console.log('✅ Successfully joined the meeting');
      return; // Success! Exit the function

    } catch (error) {
      console.error(`❌ Error on attempt ${attempt}:`, error.message);
      if (browser) {
        await browser.close();
      }
      
      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${retryDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
    } else {
        throw new Error(`Failed to join meeting after ${maxRetries} attempts: ${error.message}`);
      }
    }
  }
}

// If this file is run directly, use the MEET_URL from environment variables
if (require.main === module) {
  const meetUrl = process.env.MEET_URL;
  if (!meetUrl) {
    console.error("❌ No MEET_URL provided in environment variables");
    process.exit(1);
  }
  joinMeet(meetUrl);
}

module.exports = {
  joinMeet
}; 