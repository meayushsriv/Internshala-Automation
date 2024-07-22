const puppeteer = require("puppeteer");
const loginLink = "https://internshala.com/login/student";
const path = require("path");
const run = require("./TestGemini.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

require("dotenv").config();

let browserOpen = puppeteer.launch({
  headless: false,
  args: ["--start-maximized"],
  defaultViewport: null,
});

let page;

browserOpen
  .then(function (browserObj) {
    let browserOpenPromise = browserObj.newPage(); // Open new page
    return browserOpenPromise;
  })
  .then(function (newTab) {
    page = newTab;
    let internShalaOpenPromise = newTab.goto(loginLink); // Go to login page
    return internShalaOpenPromise;
  })
  .then(function () {
    return page.type("input[id='email']", process.env.EMAIL, { delay: 50 }); // Type email
  })
  .then(function () {
    return page.type("input[id='password']", process.env.PASSWORD, {
      delay: 50,
    }); // Type password
  })
  .then(function () {
    return page.click('button[id="login_submit"]', { delay: 40 }); // Click login button
  })
  .then(function () {
    return page.waitForNavigation(); // Wait for navigation after login
  })
  .then(function () {
    return waitAndClick('a[id="internships_new_superscript"]', page, {
      delay: 1000,
    }); // Click on internships link
  })
  .then(function () {
    return waitAndClick('input[id="matching_preference"]', page); // Click on matching preference
  })
  .then(function () {
    let allInternshipsPromise = page.$$(".easy_apply", {
      delay: 50,
    });
    return allInternshipsPromise;
  })
  .then(function (internshipsArray) {
    console.log("Number of internships : ", internshipsArray.length);
    let applyInternship = internshipApply(internshipsArray[0]);
  })
  .catch(function (err) {
    console.error("Error: ", err);
  });

function waitAndClick(selector, cPage) {
  return new Promise(function (resolve, reject) {
    cPage
      .waitForSelector(selector)
      .then(function () {
        return cPage.click(selector);
      })
      .then(function () {
        resolve();
      })
      .catch(function (error) {
        reject(error);
      });
  });
}

async function internshipApply(selector) {
  try {
    await page.evaluate((sel) => sel.click(), selector);
    await waitAndClick('button[id="continue_button"]', page);
    await waitAndClick('a[class="copyCoverLetterTitle"]', page);

    await page.waitForSelector('input[type="file"]');
    const inputUploadHandle = await page.$('input[type="file"]');
    const filePath = path.relative(
      process.cwd(),
      "./Ayush-Srivastava-Resume.pdf"
    );
    await inputUploadHandle.uploadFile(filePath);

    const assessmentQuestions = await page.evaluate(() => {
      const elements = document.querySelectorAll(".assessment_question label");
      return elements.length
        ? Array.from(elements).map((el) => el.textContent.trim())
        : null;
    });

    if (assessmentQuestions && assessmentQuestions.length > 0) {
      for (const [index, question] of assessmentQuestions.entries()) {
        const question = assessmentQuestions[0];
        console.log(`Assessment Question : ${question}`);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = question;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log(text);
        page.type('textarea[placeholder="Enter text ..."]', text, {
          delay: 50,
        });
      }
    }
    await waitAndClick('input[id="submit"]', page);
    await waitAndClick('a[id="backToInternshipsCta"]', page);
  } catch (error) {
    console.error("Error in internshipApply:", error);
  }
}
