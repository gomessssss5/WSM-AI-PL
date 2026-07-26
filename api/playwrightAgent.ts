import { chromium as playwrightLocal, Browser, Page, BrowserContext } from "playwright";
import { chromium as playwrightCore } from "playwright-core";
import sparticuzChromium from "@sparticuz/chromium";

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

export async function initPlaywright() {
  if (!browser || !browser.isConnected()) {
    try {
      const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_VERSION;
      
      if (isVercel) {
        console.log("Initializing Playwright with Sparticuz Chromium (Vercel/Lambda env)...");
        // Required for Vercel Serverless Functions
        const executablePath = await sparticuzChromium.executablePath();
        browser = await playwrightCore.launch({
          args: sparticuzChromium.args,
          executablePath: executablePath,
          headless: sparticuzChromium.headless,
        });
      } else {
        console.log("Initializing Playwright with default chromium...");
        browser = await playwrightLocal.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
      }

      context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      });
      page = await context.newPage();
    } catch (err) {
      console.error("Failed to init playwright:", err);
    }
  } else if (!page || page.isClosed()) {
    try {
      if (!context) {
        context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });
      }
      page = await context.newPage();
    } catch (err) {
      console.error("Failed to create page:", err);
    }
  }
}

export async function closePlaywright() {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
    context = null;
    page = null;
  }
}

async function getScreenshot() {
  if (!page || page.isClosed()) return null;
  try {
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 65, fullPage: false });
    return `data:image/jpeg;base64,${screenshot.toString('base64')}`;
  } catch (err) {
    console.error("Screenshot error", err);
    return null;
  }
}

export function cleanUrlString(u: string): string {
  if (!u) return "";
  let cleaned = u.trim();
  // Remove markdown quotes, backticks, parenthesis, braces, brackets, trailing periods, commas
  cleaned = cleaned.replace(/^[\(\<\"\'\`\[\{]+/, "");
  cleaned = cleaned.replace(/[\)\.\,\>\<\/\"\'\`\]\}]+$/, "");
  if (cleaned && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }
  return cleaned;
}

export async function openUrl(rawUrl: string) {
  let url = cleanUrlString(rawUrl);

  await initPlaywright();
  if (!page || page.isClosed()) return { error: "Não foi possível inicializar o navegador." };
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch (e: any) {
    console.log("Goto error/timeout, proceeding anyway:", e.message);
  }
  
  await page.waitForTimeout(1500);
  return await getPageState();
}

export async function clickSelector(selector: string) {
  await initPlaywright();
  if (!page || page.isClosed()) return { error: "Navegador não inicializado." };
  
  if (page.url() === 'about:blank' || page.url() === '') {
    await page.goto('https://search.brave.com', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  const cleanSel = selector.trim();
  try {
    let locator = page.locator(cleanSel).first();
    let count = await locator.count().catch(() => 0);
    
    if (count === 0 && !cleanSel.startsWith('text=') && !cleanSel.startsWith('#') && !cleanSel.startsWith('.')) {
      // Try text selector
      locator = page.locator(`text="${cleanSel}"`).first();
      count = await locator.count().catch(() => 0);
    }

    if (count > 0) {
      await locator.click({ timeout: 6000, force: true });
    } else {
      // Fallback click by visible text
      const fallback = page.getByText(cleanSel, { exact: false }).first();
      await fallback.click({ timeout: 5000, force: true });
    }
    
    await page.waitForTimeout(1500);
  } catch (e: any) {
    console.warn(`Click failed on ${selector}:`, e.message);
    return { error: `Não foi possível clicar em '${selector}': ${e.message}`, screenshot: await getScreenshot() };
  }
  return await getPageState();
}

export async function typeText(selector: string, text: string) {
  await initPlaywright();
  if (!page || page.isClosed()) return { error: "Navegador não inicializado." };

  if (page.url() === 'about:blank' || page.url() === '') {
    await page.goto('https://search.brave.com', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  const cleanSel = selector.trim();
  try {
    let locator = page.locator(cleanSel).first();
    let count = await locator.count().catch(() => 0);

    if (count === 0 && !cleanSel.startsWith('#') && !cleanSel.startsWith('.')) {
      locator = page.getByPlaceholder(cleanSel).first();
      count = await locator.count().catch(() => 0);
    }

    if (count === 0) {
      locator = page.locator('input[type="text"], input[type="search"], input:not([type="hidden"]), textarea').first();
      count = await locator.count().catch(() => 0);
    }

    if (count > 0) {
      await locator.fill(text, { timeout: 6000, force: true });
      await locator.press('Enter').catch(() => {});
    } else {
      return { error: `Campo '${selector}' não encontrado para digitar.`, screenshot: await getScreenshot() };
    }

    await page.waitForTimeout(1500);
  } catch (e: any) {
    console.warn(`Type failed on ${selector}:`, e.message);
    return { error: `Não foi possível digitar em '${selector}': ${e.message}`, screenshot: await getScreenshot() };
  }
  return await getPageState();
}

export async function extractText() {
  await initPlaywright();
  return await getPageState();
}

export async function scrollPage(direction: 'down' | 'up' = 'down', amount: number = 500) {
  await initPlaywright();
  if (!page || page.isClosed()) return { error: "Navegador não inicializado." };

  if (page.url() === 'about:blank' || page.url() === '') {
    await page.goto('https://search.brave.com', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  try {
    const scrollY = direction === 'up' ? -Math.abs(amount) : Math.abs(amount);
    await page.evaluate((y) => {
      window.scrollBy({ top: y, behavior: 'smooth' });
    }, scrollY);
    await page.waitForTimeout(1000);
  } catch (e: any) {
    console.warn(`Scroll failed:`, e.message);
  }
  return await getPageState();
}

export async function getPageState() {
  if (!page || page.isClosed()) return { error: "Nenhuma página ativa no momento." };
  try {
    const url = page.url();
    const title = await page.title().catch(() => '');
    const pageData = await page.evaluate(() => {
      const interactables = Array.from(document.querySelectorAll('a, button, input, textarea, select, [role="button"], [role="link"]'));
      
      const elementsList = interactables.map((el) => {
        const bounds = el.getBoundingClientRect();
        if (bounds.width === 0 || bounds.height === 0) return null; // invisible
        
        let text = el.textContent?.trim() || (el as HTMLInputElement).value || (el as HTMLInputElement).placeholder || el.getAttribute('aria-label') || el.getAttribute('alt') || '';
        if (text.length > 60) text = text.substring(0, 60) + "...";
        text = text.replace(/\s+/g, ' ');

        const tag = el.tagName.toLowerCase();
        
        let cssSelector = "";
        if (el.id) {
          cssSelector = `#${el.id}`;
        } else if (el.getAttribute('name')) {
          cssSelector = `${tag}[name="${el.getAttribute('name')}"]`;
        } else if (el.getAttribute('aria-label')) {
          cssSelector = `${tag}[aria-label="${el.getAttribute('aria-label')}"]`;
        } else if (el.getAttribute('placeholder')) {
          cssSelector = `${tag}[placeholder="${el.getAttribute('placeholder')}"]`;
        } else if (el.getAttribute('type') && (tag === 'input' || tag === 'button')) {
          cssSelector = `${tag}[type="${el.getAttribute('type')}"]`;
        } else if (text) {
          cssSelector = `text="${text}"`;
        }

        return {
          tag,
          text: text || undefined,
          cssSelector: cssSelector || undefined
        };
      }).filter(Boolean);
      
      let bodyText = document.body.innerText || "";
      return {
        bodyText: bodyText.substring(0, 2500),
        elements: elementsList.slice(0, 40)
      };
    }).catch(() => ({ bodyText: '', elements: [] }));

    const screenshot = await getScreenshot();
    return { 
      url, 
      title, 
      text: pageData.bodyText,
      interactable_elements: pageData.elements,
      screenshot 
    };
  } catch (err: any) {
    return { error: `Falha ao obter estado da página: ${err.message}` };
  }
}

