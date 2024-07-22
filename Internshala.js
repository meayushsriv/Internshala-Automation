const puppeteer = require("puppeteer");
const loginLink = "https://internshala.com/login/student";
const path = require("path");

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
    return waitAndClick('a[id="internships_new_superscript"]', page); // Click on internships link
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
  return new Promise((resolve, reject) => {
    page
      .evaluate((selector) => {
        let internshipClick = selector.click();
      }, selector)
      .then(function () {
        return waitAndClick('button[id="continue_button"]', page);
      })
      .then(function () {
        return waitAndClick('a[class="copyCoverLetterTitle"]', page);
      })
      .then(() => {
        return page.waitForSelector('input[type="file"]');
      })
      .then(() => {
        return page.$('input[type="file"]');
      })
      .then((inputUploadHandle) => {
        const filePath = path.relative(
          process.cwd(),
          "./Ayush-Srivastava-Resume.pdf"
        );
        return inputUploadHandle.uploadFile(filePath);
      })
      .catch((error) => {
        reject(error);
      });
  });
}
