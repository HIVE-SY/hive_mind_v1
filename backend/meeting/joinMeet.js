const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
require('dotenv').config();
const { Storage } = require('@google-cloud/storage');

// Add stealth plugin
puppeteer.use(StealthPlugin());

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

// Helper: Only exit process if running as a script
let shouldExitProcess = false;

async function uploadScreenshot(localPath, gcsDest) {
  await storage.bucket(bucketName).upload(localPath, {
    destination: gcsDest,
    public: false
  });
  console.log(`Screenshot uploaded: gs://${bucketName}/${gcsDest}`);
}

async function launchBotForMeeting(meetingUrl) {
  const isProd = process.env.NODE_ENV === 'production';
  const sessionProfilePath = isProd ? `/tmp/bot-profile-${uuidv4()}` : './meeting/bot-profile';
  
  // Ensure the directory exists for development if it's a local path
  if (!isProd) {
    await fs.ensureDir(sessionProfilePath);
  }

  const browser = await puppeteer.launch({
    headless: isProd, // Headless in production, non-headless in dev
    userDataDir: sessionProfilePath,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1280,720',
      '--use-fake-ui-for-media-stream',
      `--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36`,
      '--no-sandbox', // Required for some Linux environments in production
      '--disable-setuid-sandbox', // Required for some Linux environments in production
      '--disable-dev-shm-usage', // Crucial for limited /dev/shm in containers
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--no-zygote',
      '--single-process'
    ]
  });

  const context = browser.defaultBrowserContext();
  await context.overridePermissions('https://meet.google.com', ['microphone', 'camera']);

  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'navigate'
    });

    return { browser, page, sessionProfilePath };
  } catch (err) {
    await browser.close();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Add a small delay before cleanup
    if (fs.existsSync(sessionProfilePath)) {
      await fs.remove(sessionProfilePath); // Ensure async removal
    }
    throw err;
  }
}

async function cleanupProfile(sessionProfilePath) {
  try {
    if (fs.existsSync(sessionProfilePath)) {
      await fs.remove(sessionProfilePath); // Ensure async removal
    }
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

async function verifyMeetingJoin(page) {
  // Check for the bottom bar with call controls (role="region" and class Tmb7Fd)
  const isInMeeting = await page.evaluate(() => {
    return !!document.querySelector('div[role="region"].Tmb7Fd');
  });

  if (isInMeeting) {
    console.log('✅ Found call controls bar (role="region" and class="Tmb7Fd"), we are in the meeting');
    return true;
  }

  console.log('⚠️ Could not verify we are in the meeting');
  await page.screenshot({ path: '/tmp/not_joined_no_end_call_button.png' });
  await uploadScreenshot('/tmp/not_joined_no_end_call_button.png', 'meet-debug/not_joined_no_end_call_button.png');
  return false;
}

async function handleJoinButton(page) {
  console.log('🔍 Looking for join button...');

  // Log all button texts and aria-labels for debugging
  const allButtons = await page.$$('button');
  for (const button of allButtons) {
    const text = await page.evaluate(el => el.textContent, button);
    const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), button);
    console.log('Button:', { text, ariaLabel });
  }

  // Try multiple selectors for the join button
  const selectors = [
    'button[jsname="Qx7uuf"]',
    'button[jsname="Qx7uuf"]:not([disabled])',
    'button[aria-label*="join" i]',
    'button[aria-label*="solicitar" i]',
    'button:has-text("Ask to join")',
    'button:has-text("Join now")',
    'button:has-text("Solicitar")'
  ];

  for (const selector of selectors) {
    try {
      const elements = await page.$$(selector);
      for (const element of elements) {
        const text = await page.evaluate(el => el.textContent.toLowerCase(), element);
        const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label')?.toLowerCase() || '', element);
        
        if (text.includes('ask to join') || text.includes('solicitar') || text.includes('join now') ||
            ariaLabel.includes('ask to join') || ariaLabel.includes('solicitar') || ariaLabel.includes('join now')) {
          console.log(`✅ Found join button with selector: ${selector}`);
          await page.screenshot({ path: '/tmp/join_call_button_found.png' });
          await uploadScreenshot('/tmp/join_call_button_found.png', 'meet-debug/join_call_button_found.png');
          
          // Wait for button to be clickable
          await page.waitForFunction(
            (sel) => {
              const btn = document.querySelector(sel);
              return btn && !btn.disabled && window.getComputedStyle(btn).display !== 'none';
            },
            { timeout: 5000 },
            selector
          );
          
          await element.click();
          console.log('⏳ Waiting for host to accept join request...');
          await new Promise(resolve => setTimeout(resolve, 15000));
          return await verifyMeetingJoin(page);
        }
      }
    } catch (error) {
      console.log(`Selector ${selector} not found, trying next...`);
    }
  }

  // Fallback to checking all buttons
  for (const button of allButtons) {
    const text = await page.evaluate(el => el.textContent.toLowerCase(), button);
    const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label')?.toLowerCase() || '', button);
    
    if (text.includes('ask to join') || text.includes('solicitar') || text.includes('join now') ||
        ariaLabel.includes('ask to join') || ariaLabel.includes('solicitar') || ariaLabel.includes('join now')) {
      console.log('✅ Found join button by text content');
      await page.screenshot({ path: '/tmp/join_call_button_found_fallback.png' });
      await uploadScreenshot('/tmp/join_call_button_found_fallback.png', 'meet-debug/join_call_button_found_fallback.png');
      
      // Wait for button to be clickable
      await page.waitForFunction(
        (btn) => {
          return !btn.disabled && window.getComputedStyle(btn).display !== 'none';
        },
        { timeout: 5000 },
        button
      );
      
      await button.click();
      console.log('⏳ Waiting for host to accept join request...');
      await new Promise(resolve => setTimeout(resolve, 15000));
      return await verifyMeetingJoin(page);
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

async function dismissPopups(page) {
  try {
    console.log('🔍 Looking for pop-ups to dismiss...');
    const gotItButton = await page.$('button:has-text("Got it")');
    if (gotItButton) {
      console.log('✅ Found "Got it" button, clicking to dismiss pop-up.');
      await gotItButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.log('⚠️ No dismissed pop-ups:', error.message);
  }
}

// Check if the bot is alone in the meeting (robust, language-independent, flexible to class changes)
async function isBotAlone(page) {
  return await page.evaluate(() => {
    // Try to find the participant count badge in the bottom bar
    // Look for the people icon button (aria-label may vary by language)
    const peopleButton = Array.from(document.querySelectorAll('button,div'))
      .find(el =>
        el.getAttribute('aria-label') &&
        (
          el.getAttribute('aria-label').toLowerCase().includes('show everyone') ||
          el.getAttribute('aria-label').toLowerCase().includes('personas') || // Spanish
          el.getAttribute('aria-label').toLowerCase().includes('participants')
        )
      );
    if (peopleButton) {
      // Look for a badge or span/div with a number inside the button
      const badge = peopleButton.querySelector('span,div');
      if (badge && badge.textContent.trim() === '1') {
        return true;
      }
    }
    // Fallback: look for any badge with just '1' in the bottom bar
    const badges = Array.from(document.querySelectorAll('span,div'))
      .filter(el => el.textContent.trim() === '1');
    if (badges.length > 0) {
      return true;
    }
    return false;
  });
}

async function checkMeetingEnded(page, browser, sessionProfilePath) {
  try {
    const isInMeeting = await verifyMeetingJoin(page);
    
    if (!isInMeeting) {
      console.log('👋 Meeting ended or left, cleaning up...');
      if (meetingStatusInterval) clearInterval(meetingStatusInterval);
      if (aloneCheckInterval) clearInterval(aloneCheckInterval);
      if (browser) await browser.close();
      if (sessionProfilePath) await cleanupProfile(sessionProfilePath);
      return true;
    }
    return false;
  } catch (error) {
    console.log('⚠️ Error checking meeting status:', error.message);
    return true; // Assume meeting ended on error
  }
}

async function joinMeet(meetingUrl, maxRetries = 3, retryDelay = 5000, onBotExitCallback = () => {}) {
  let attempt = 0;
  let sessionProfilePath;
  let browserInstance = null;
  let meetingStatusInterval = null;
  let aloneCheckInterval = null;

  // Use NODE_ENV to determine if we're in development mode
  const isDev = process.env.NODE_ENV === 'dev';
  const ALONE_CHECK_DELAY = isDev ? 10000 : 5 * 60 * 1000; // 10 seconds in dev mode, 5 minutes in production
  const CHECK_INTERVAL = isDev ? 5000 : 15000; // 5 seconds in dev mode, 15 seconds in production

  while (attempt < maxRetries) {
    attempt++;
    console.log(`\n🔄 Attempt ${attempt} of ${maxRetries} to join meeting...`);
    
    try {
      const { browser, page, sessionProfilePath: newProfilePath } = await launchBotForMeeting(meetingUrl);
      browserInstance = browser;
      sessionProfilePath = newProfilePath;

      // Add request interception for analytics blocking
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const blocked = [
          'google.com/log',
          'doubleclick.net',
          'google-analytics.com',
          'googletagmanager.com'
        ];
        blocked.some(url => req.url().includes(url)) ? req.abort() : req.continue();
      });

      console.log('🌐 Navigating to meeting:', meetingUrl);
      await page.goto(meetingUrl, { waitUntil: 'networkidle0', timeout: 60000 });
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check for common error messages after navigation
      const pageText = await page.evaluate(() => document.body.innerText);
      if (pageText.includes("You can't join this video call") || pageText.includes("You can't create a meeting yourself")) {
        await page.screenshot({ path: '/tmp/meet_error_page.png' });
        await uploadScreenshot('/tmp/meet_error_page.png', 'meet-debug/meet_error_page.png');
        throw new Error('Meeting access denied or invalid URL: Bot cannot join or create this meeting.');
      }

      await page.screenshot({ path: '/tmp/meet_debug_full_load.png' });
      await uploadScreenshot('/tmp/meet_debug_full_load.png', 'meet-debug/meet_debug_full_load.png');

      // Dismiss any initial pop-ups
      await dismissPopups(page);

      await handleNameInput(page);
      
      const joined = await handleJoinButton(page);
      if (!joined) {
        throw new Error('Failed to find join button');
      }
      
      // Dismiss any pop-ups after joining
      await dismissPopups(page);

      await ensureMediaSettings(page);
      
      // Start checking for meeting end status
      meetingStatusInterval = setInterval(async () => {
        const ended = await checkMeetingEnded(page, browserInstance, sessionProfilePath);
        if (ended) {
          console.log('Process will now exit because the meeting has ended.');
          if (shouldExitProcess) process.exit(0);
          else onBotExitCallback('Meeting ended');
        }
      }, CHECK_INTERVAL);

      // Wait before starting to check if the bot is alone
      console.log(`⏳ Waiting ${ALONE_CHECK_DELAY/1000} seconds before starting alone check...`);
      setTimeout(() => {
        console.log('🔍 Starting alone check interval...');
        aloneCheckInterval = setInterval(async () => {
          console.log('🔍 Checking if bot is alone...');
          const alone = await isBotAlone(page);
          console.log('Alone check result:', alone);
          if (alone) {
            console.log('🤖 Bot is alone in the meeting, leaving...');
            if (meetingStatusInterval) clearInterval(meetingStatusInterval);
            if (aloneCheckInterval) clearInterval(aloneCheckInterval);
            if (browserInstance) await browserInstance.close();
            if (sessionProfilePath) await cleanupProfile(sessionProfilePath);
            if (shouldExitProcess) process.exit(0);
            else onBotExitCallback('Meeting ended, check your recent conversations.');
            return;
          }
        }, CHECK_INTERVAL);
      }, ALONE_CHECK_DELAY);

      console.log('✅ Successfully joined the meeting');
      return { browser: browserInstance, page, sessionProfilePath };

    } catch (error) {
      console.error(`❌ Error on attempt ${attempt}:`, error.message);
      if (browserInstance) {
        try {
          await browserInstance.close();
        } catch (closeError) {
          console.error('⚠️ Error closing browser during retry:', closeError);
        }
      }
      if (sessionProfilePath) {
        await cleanupProfile(sessionProfilePath);
      }
      if (meetingStatusInterval) {
        clearInterval(meetingStatusInterval);
      }
      if (aloneCheckInterval) {
        clearInterval(aloneCheckInterval);
      }
      
      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${retryDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('❌ Max retries reached, giving up');
        // Notify onBotExitCallback only if it's not a script exit
        if (!shouldExitProcess && onBotExitCallback) {
          onBotExitCallback('Max retries reached, failed to join');
        }
        return false;
      }
    }
  }
  return false;
}

if (require.main === module) {
  shouldExitProcess = true;
  const meetUrl = process.env.MEET_URL;
  const isDev = process.env.NODE_ENV === 'dev';
  
  if (!meetUrl) {
    console.error("❌ No MEET_URL provided in environment variables");
    process.exit(1);
  } 
  
  joinMeet(meetUrl)
    .then(result => {
      if (result && result.browser) {
        console.log('🎉 Bot successfully joined the meeting and will remain active. Press Ctrl+C to exit.');
        if (isDev) {
          console.log('🧪 Running in development mode - alone check will start in 10 seconds');
        }
        setInterval(() => {}, 1000);
      } else {
        console.error('❌ Failed to join the meeting after all retries.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error joining meeting:', error);
      process.exit(1);
    });
}

module.exports = {
  joinMeet,
  cleanupProfile
}; 