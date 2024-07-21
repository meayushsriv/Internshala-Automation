const puppeteer = require("puppeteer");
const loginLink = "https://internshala.com/login/student";

require("dotenv").config();

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ["--start-maximized"],
      defaultViewport: null,
    });
    const page = await browser.newPage();
    await page.goto(loginLink);
    await page.type("input[id='email']", process.env.EMAIL, { delay: 50 });
    await page.type("input[id='password']", process.env.PASSWORD, {
      delay: 50,
    });
    await page.click('button[id="login_submit"]', { delay: 40 });
    await page.waitForNavigation(); // Ensure navigation is complete after login
    await waitAndClick('a[id="internships_new_superscript"]', page);
    await waitAndClick('input[id="matching_preference"]', page);
  } catch (err) {
    console.error("Error: ", err);
  }
})();

async function waitAndClick(selector, cPage) {
  try {
    await cPage.waitForSelector(selector);
    await cPage.click(selector);
  } catch (error) {
    console.error("Error in waitAndClick:", error);
  }
}

async function waitAndType(selector, cPage, value) {
  try {
    await cPage.waitForSelector(selector);
    await cPage.type(selector, value);
  } catch (error) {
    console.error("Error in waitAndType:", error);
  }
}
