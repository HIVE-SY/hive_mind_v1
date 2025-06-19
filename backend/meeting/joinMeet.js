import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { Storage } from '@google-cloud/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
      '--js-flags="--max-old-space-size=512"'
    ],
    ignoreHTTPSErrors: true,
    timeout: 60000,
    defaultViewport: {
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false
    }
  });

  const context = browser.defaultBrowserContext();
  await context.overridePermissions('https://meet.google.com', ['microphone', 'camera']);

  try {
    const page = await browser.newPage();
    
    // Enhanced stealth measures
    await page.evaluateOnNewDocument(() => {
      // Override navigator properties
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      
      // Add Chrome-specific properties
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };
    });

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });

    // Set default timeout
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    return { browser, page, sessionProfilePath };
  } catch (err) {
    await browser.close();
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (fs.existsSync(sessionProfilePath)) {
      await fs.remove(sessionProfilePath);
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
      console.log(`⚠️ Error with selector ${selector}:`, error.message);
    }
  }

  console.log('❌ Could not find join button');
  return false;
}

async function ensureMediaSettings(page) {
  try {
    console.log('🔍 Checking media settings...');
    
    // Wait for media settings dialog
    await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
    
    // Check if microphone is muted
    const isMicMuted = await page.evaluate(() => {
      const micButton = document.querySelector('button[aria-label*="microphone" i]');
      return micButton && micButton.getAttribute('aria-pressed') === 'true';
    });
      
    if (isMicMuted) {
      console.log('🎤 Unmuting microphone...');
      await page.click('button[aria-label*="microphone" i]');
      }
    
    // Check if camera is off
    const isCameraOff = await page.evaluate(() => {
      const cameraButton = document.querySelector('button[aria-label*="camera" i]');
      return cameraButton && cameraButton.getAttribute('aria-pressed') === 'true';
    });

    if (isCameraOff) {
      console.log('📹 Turning on camera...');
      await page.click('button[aria-label*="camera" i]');
    }
    
    console.log('✅ Media settings configured');
  } catch (error) {
    console.log('⚠️ Error configuring media settings:', error.message);
  }
}

async function dismissPopups(page) {
  try {
    // Dismiss any popups that might appear
    const popupSelectors = [
      'button[aria-label="Dismiss"]',
      'button[aria-label="Close"]',
      'button[aria-label="Got it"]',
      'button[aria-label="No thanks"]'
    ];
    
    for (const selector of popupSelectors) {
      const elements = await page.$$(selector);
      for (const element of elements) {
        await element.click();
        console.log(`✅ Dismissed popup with selector: ${selector}`);
      }
    }
  } catch (error) {
    console.log('⚠️ Error dismissing popups:', error.message);
  }
}

async function isBotAlone(page) {
  try {
    // Check if there are other participants in the meeting
    const participants = await page.$$('div[data-self-name]');
    return participants.length <= 1; // Only the bot is present
  } catch (error) {
    console.log('⚠️ Error checking if bot is alone:', error.message);
    return false;
  }
}

async function checkMeetingEnded(page, browser, sessionProfilePath) {
  try {
    // Check if the meeting has ended
    const isEnded = await page.evaluate(() => {
      return document.querySelector('div[role="dialog"]')?.textContent.includes('Call ended') ||
             document.querySelector('div[role="dialog"]')?.textContent.includes('Reunião encerrada');
    });
    
    if (isEnded) {
      console.log('👋 Meeting has ended, cleaning up...');
      await browser.close();
      await cleanupProfile(sessionProfilePath);
      return true;
    }
    return false;
  } catch (error) {
    console.log('⚠️ Error checking if meeting ended:', error.message);
    return false;
  }
}

async function joinMeet(meetingUrl, maxRetries = 3, retryDelay = 5000, onBotExitCallback = () => {}) {
  let attempt = 0;
  let sessionProfilePath;
  let browserInstance = null;
  let meetingStatusInterval = null;
  let aloneCheckInterval = null;

  const isDev = process.env.NODE_ENV === 'dev';
  const ALONE_CHECK_DELAY = isDev ? 10000 : 5 * 60 * 1000;
  const CHECK_INTERVAL = isDev ? 5000 : 15000;

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
      
      // Enhanced navigation with retry logic
      let navigationSuccess = false;
      let navigationAttempts = 0;
      const maxNavigationAttempts = 3;
      
      while (!navigationSuccess && navigationAttempts < maxNavigationAttempts) {
        try {
          // First try to navigate to a blank page
          await page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 30000 });
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Then navigate to the actual meeting URL
          await page.goto(meetingUrl, { 
            waitUntil: ['domcontentloaded', 'networkidle0'],
            timeout: 60000 
          });
          
          // Wait for the page to be fully loaded
          await page.waitForFunction(() => {
            return document.readyState === 'complete' && 
                   !document.querySelector('div[role="progressbar"]') &&
                   document.querySelector('body');
          }, { timeout: 30000 });
          
          navigationSuccess = true;
        } catch (navError) {
          navigationAttempts++;
          console.log(`Navigation attempt ${navigationAttempts} failed:`, navError.message);
          if (navigationAttempts < maxNavigationAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            throw navError;
          }
        }
      }

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

export { joinMeet, cleanupProfile }; 