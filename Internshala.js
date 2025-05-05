require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const puppeteer = require("puppeteer");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = 3001;

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Handle Form Submission
app.post("/submit", upload.single("resume"), async (req, res) => {
  const { email, password } = req.body;
  const resumePath = path.join(__dirname, req.file.path);

  try {
    const buffer = fs.readFileSync(resumePath);
    const pdfData = await pdfParse(buffer);
    const resumeSummary = pdfData.text.slice(0, 1500);

    await autoApplyInternships(email, password, resumeSummary);
    res.send("Internships Applied Successfully!");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Failed to process your request.");
  }
});

app.listen(port, () =>
  console.log(`Server running on http://localhost:${port}`)
);

// Puppeteer + Gemini Flow
async function autoApplyInternships(email, password, resumeSummary) {
  const loginLink = "https://internshala.com/login/student";
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--start-maximized"],
    defaultViewport: null,
  });
  const page = await browser.newPage();

  await page.goto(loginLink);
  await page.type("input[id='email']", email, { delay: 50 });
  await page.type("input[id='password']", password, { delay: 50 });
  await page.click("button[id='login_submit']", { delay: 40 });
  await page.waitForNavigation();

  await waitAndClick('a[id="internships_new_superscript"]', page);
  await waitAndClick('input[id="matching_preference"]', page);

  const internships = await page.$$(".easy_apply");
  for (let internship of internships) {
    await internshipApply(internship, page, resumeSummary);
  }

  await browser.close();
}

function waitAndClick(selector, cPage) {
  return cPage.waitForSelector(selector).then(() => cPage.click(selector));
}

async function internshipApply(selector, page, resumeSummary) {
  try {
    await page.evaluate((sel) => sel.click(), selector);
    await waitAndClick('button[id="continue_button"]', page);
    await waitAndClick('a[class="copyCoverLetterTitle"]', page);

    const questionsAndTextAreas = await page.evaluate(() => {
      const questions = Array.from(
        document.querySelectorAll(".assessment_question label")
      );
      const textAreas = Array.from(
        document.querySelectorAll('textarea[placeholder="Enter text ..."]')
      );

      return questions.map((question, index) => ({
        questionText: question.textContent.trim(),
        textAreaName: textAreas[index]
          ? textAreas[index].getAttribute("name")
          : null,
      }));
    });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    for (const { questionText, textAreaName } of questionsAndTextAreas) {
      if (!textAreaName) continue;

      const result = await model.generateContent([
        {
          role: "user",
          parts: [
            {
              text: `My resume:\n${resumeSummary}\n\nPlease answer this internship assessment question in under 100 words:\n\"${questionText}\"`,
            },
          ],
        },
      ]);

      const text = await result.response.text();
      await page.type(`textarea[name="${textAreaName}"]`, text, { delay: 50 });
    }

    await waitAndClick('input[id="submit"]', page);
    await page.goto(
      "https://internshala.com/internships/matching-preferences/"
    );
  } catch (error) {
    console.error("Error in internshipApply:", error);
  }
}
