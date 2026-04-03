const express = require("express");
const cors = require("cors");
const fs = require("fs");
const os = require("os");
const path = require("path");
const axios = require("axios");
const puppeteer = require("puppeteer");
const { app: electronApp } = require("electron");
const { exec } = require("child_process");
const { print: winPrint, getPrinters } = require("pdf-to-printer");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, onChildAdded, update } = require("firebase/database");

const customerTemplate = require("./templates/customer");
const kitchenTemplate = require("./templates/kitchen");
const barTemplate = require("./templates/bar");

const app = express();
app.use(cors());
app.use(express.json());

let unsubscribe = null;
const isElectron = !!process.versions.electron;
const imageCache = new Map();

const PDF_DIR = isElectron
  ? path.join(electronApp.getPath("userData"), "pdf")
  : path.join(process.cwd(), "pdf");

const CONFIG_FILE = isElectron
  ? path.join(electronApp.getPath("userData"), "config.json")
  : path.join(process.cwd(), "config.json");

// =========================
// Kiểm tra cấu hình.
// =========================
function getConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return { printers: {}, firebase: {} };
    }

    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const config = JSON.parse(raw);

    if (!config.printers) config.printers = {};
    if (!config.firebase) config.firebase = {};

    return config;
  } catch (err) {
    console.error("Config lỗi:", err);
    return { printers: {}, firebase: {} };
  }
}

function initFirebase() {
  try {
    const config = getConfig();
    
    if (!config.firebase?.api || !config.firebase?.database) {
      return;
    }

    const firebaseConfig = {
      apiKey: config.firebase.api,
      databaseURL: config.firebase.database,
    };

    const { getApps, deleteApp } = require("firebase/app");

    if (getApps().length) {
      getApps().forEach(app => deleteApp(app));
    }

    fbApp = initializeApp(firebaseConfig);
    db = getDatabase(fbApp);
    startFirebaseListener();
  } catch (err) {
    console.error("Init Firebase lỗi:", err.message);
  }
}

function hasData(data) {
  if (!data) return false;
  if (Array.isArray(data)) return data.length > 0;
  if (typeof data === "object") return Object.keys(data).length > 0;
  return true;
};

// =========================
// Hành động.
// =========================

function printFile(file, printerName) {
  return new Promise((resolve, reject) => {
    const platform = os.platform();

    if (platform === "win32") {
      winPrint(file, { printer: printerName })
        .then(resolve)
        .catch(reject);
    } else if (platform === "linux") {
      const cmd = printerName
        ? `lp -d "${printerName}" "${file}"`
        : `lp "${file}"`;

      exec(cmd, (err, stdout, stderr) => {
        if (err) return reject(err);
        resolve(stdout);
      });
    }

    else {
      reject("OS không hỗ trợ");
    }
  });
}

async function createPDF(file, data, info, templateFn) {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  
  const page = await browser.newPage();

  const html = templateFn(data, info);

  await page.setContent(html, { waitUntil: "domcontentloaded" });

  await page.pdf({
    path: file,
    width: "80mm",
    printBackground: true,
  });

  await browser.close();
}

async function handlePrint(order) {
  const config = getConfig();
  const jobs = [];

  if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
  }

  if (config.printers?.customer && hasData(order.customer)) {
    const file = path.join(PDF_DIR, `customer_${Date.now()}.pdf`);
    
    const imgBase64 = await loadImageToBase64(order.info?.qr_code);
    if (order.info) {
      order.info.qr_code = imgBase64 || "";
    }

    await createPDF(file, order.customer, order.info, customerTemplate);
    jobs.push(
      printFile(file, config.printers.customer)
        .then(() => fs.unlinkSync(file))
        .catch(console.error)
    );
  }

  if (config.printers?.kitchen && hasData(order.kitchen)) {
    const file = path.join(PDF_DIR, `kitchen_${Date.now()}.pdf`);
    await createPDF(file, order.kitchen, order.info, kitchenTemplate);
    jobs.push(
      printFile(file, config.printers.kitchen)
        .then(() => fs.unlinkSync(file))
        .catch(console.error)
    );
  }

  if (config.printers?.bar && hasData(order.bar)) {
    await Promise.all(
      (order.bar || []).map(async (item, index) => {
        let file = path.join(PDF_DIR, `bar_${Date.now()}_${index}.pdf`);
        await createPDF(file, item, order.info, barTemplate);
        jobs.push(
          printFile(file, config.printers.bar)
            .then(() => fs.unlinkSync(file))
            .catch(console.error)
        );
      })
    );
  }

  Promise.all(jobs)
    .then(() => console.log("In xong tất cả"))
    .catch(err => console.error("Lỗi in:", err));
}

// =========================
// Lấy danh sách máy in.
// =========================
app.get("/printers", async (req, res) => {
  try {
    const printers = await getPrinters();
    res.json(printers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================
// Lấy config.
// =========================
app.get("/config", (req, res) => {
  res.json(getConfig());
});

// =========================
// Ảnh base64.
// =========================
async function loadImageToBase64(url) {
  if (!url) {
    return "";
  }

  if (imageCache.has(url)) {
    return imageCache.get(url);
  }

  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 5000,
    });

    const type = res.headers["content-type"];
    const base64 = Buffer.from(res.data).toString("base64");
    const result = `data:${type};base64,${base64}`;

    imageCache.set(url, result);

    return result;
  } catch (err) {
    console.error("Load image failed:", err.message);
    return "";
  }
}

// =========================
// Set cấu hình máy in
// =========================
app.post("/set-config", (req, res) => {
  const data = req.body;

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "Phải là array" });
  }

  const config = getConfig();

  data.forEach(item => {
    const { type } = item;

    if (type == "print") {
      const { printerType, printerName } = item;
      if (printerType && printerName) {
        config.printers[printerType] = printerName;
      }
    }

    if (type == "firebase") {
      const { api, database } = item;

      if (api && database) {
        config.firebase.api = api;
        config.firebase.database = database;
      }
    }
  });

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  initFirebase();
  res.json({ success: true });
});

// =========================
// API IN HÓA ĐƠN
// =========================
app.post("/print", async (req, res) => {
  try {
    const order = req.body;
    await handlePrint(order);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================
// FIREBASE LISTENER
// =========================
function startFirebaseListener() {
  if (!db) return;

  const jobsRef = ref(db, "print_jobs");

  if (unsubscribe) {
    unsubscribe();
  }

  unsubscribe = onChildAdded(jobsRef, async (snapshot) => {
    const job = snapshot.val();
    const key = snapshot.key;

    if (!job || job.status !== "pending") return;

    try {
      await handlePrint(job);
      await update(ref(db, `print_jobs/${key}`), {
        status: "done",
        doneAt: Date.now(),
      });
    } catch (err) {
      await update(ref(db, `print_jobs/${key}`), {
        status: "error",
        error: err.message,
      });
    }
  });
}

// =========================
// Start server
// =========================
app.listen(3242, () => {
  console.log("Print server chạy tại http://localhost:3242");
});

initFirebase();