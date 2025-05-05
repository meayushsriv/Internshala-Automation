const express = require("express");
const multer = require("multer");
const path = require("path");
const { runPuppeteerLogic } = require("./Internshala.js");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.post("/apply", upload.single("resumeFile"), async (req, res) => {
  const { email, password, apiKey, resumeData } = req.body;
  const resumePath = path.resolve(__dirname, req.file.path);

  try {
    const result = await runPuppeteerLogic({
      email,
      password,
      apiKey,
      resumeData,
      resumePath,
    });
    res.send(`<pre>${result}</pre>`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong. Please try again.");
  }
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
