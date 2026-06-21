const express = require("express");
const cors = require("cors");
const fs = require("fs");
const os = require("os");
const path = require("path");
const dns = require("dns").promises;
const axios = require("axios");
const puppeteer = require("puppeteer");
const { app: electronApp } = require("electron");
const { exec } = require("child_process");
const { print: winPrint, getPrinters } = require("pdf-to-printer");
const { initializeApp, getApps, deleteApp } = require("firebase/app");
const { getDatabase, ref, onChildAdded, update, runTransaction } = require("firebase/database");

const customerTemplate = require("./templates/customer");
const kitchenTemplate = require("./templates/kitchen");
const barTemplate = require("./templates/bar");

const app = express();
app.use(cors());
app.use(express.json());

// =========================
// BIẾN TOÀN CỤC
// =========================
let db = null;
let fbApp = null;
let unsubscribe = null;
let browserInstance = null;
let serverInstance = null;
let firebaseRetryTimer = null;

const imageCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const FIREBASE_RETRY_MS = 10 * 1000;
const FIREBASE_STALE_PROCESSING_MS = 5 * 60 * 1000;
const INSTANCE_ID = `${os.hostname()}-${process.pid}-${Date.now()}`;

const isElectron = !!process.versions.electron;

const PDF_DIR = isElectron
  ? path.join(electronApp.getPath("userData"), "pdf")
  : path.join(process.cwd(), "pdf");

const CONFIG_FILE = isElectron
  ? path.join(electronApp.getPath("userData"), "config.json")
  : path.join(process.cwd(), "config.json");

const DEFAULT_CONFIG_FILE = path.join(__dirname, "config.json");

function ensureConfigFile() {
  if (fs.existsSync(CONFIG_FILE)) return;

  try {
    if (fs.existsSync(DEFAULT_CONFIG_FILE)) {
      fs.copyFileSync(DEFAULT_CONFIG_FILE, CONFIG_FILE);
    } else {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ printers: {}, firebase: {} }, null, 2));
    }
  } catch (err) {
    console.error("Không thể tạo config:", err.message);
  }
}

// =========================
// CONFIG
// =========================
function getConfig() {
  try {
    ensureConfigFile();

    if (!fs.existsSync(CONFIG_FILE)) {
      return { printers: {}, firebase: {} };
    }
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    return {
      printers: config.printers || {},
      firebase: config.firebase || {},
    };
  } catch (err) {
    console.error("Config lỗi:", err);
    return { printers: {}, firebase: {} };
  }
}

// =========================
// FIREBASE
// =========================
async function canReachFirebase(databaseUrl) {
  try {
    const host = new URL(databaseUrl).hostname;
    await dns.lookup(host);
    return true;
  } catch {
    return false;
  }
}

async function initFirebase() {
  try {
    clearTimeout(firebaseRetryTimer);
    firebaseRetryTimer = null;

    const config = getConfig();

    if (!config.firebase?.api || !config.firebase?.database) {
      console.log("Chưa cấu hình Firebase");
      return;
    }

    if (!(await canReachFirebase(config.firebase.database))) {
      console.log("Chưa có mạng hoặc chưa tới được Firebase, sẽ thử lại...");
      scheduleFirebaseRetry();
      return;
    }

    if (getApps().length) {
      await Promise.all(getApps().map(app => deleteApp(app).catch(() => {})));
    }

    fbApp = initializeApp({
      apiKey: config.firebase.api,
      databaseURL: config.firebase.database,
    });

    db = getDatabase(fbApp);
    startFirebaseListener();
  } catch (err) {
    console.error("Firebase lỗi:", err.message);
    scheduleFirebaseRetry();
  }
}

function scheduleFirebaseRetry() {
  if (firebaseRetryTimer) return;

  firebaseRetryTimer = setTimeout(() => {
    firebaseRetryTimer = null;
    initFirebase();
  }, FIREBASE_RETRY_MS);
}

// =========================
// UTIL
// =========================
function hasData(data) {
  if (!data) return false;
  if (Array.isArray(data)) return data.length > 0;
  if (typeof data === "object") return Object.keys(data).length > 0;
  return true;
}

function safeDelete(file) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

// =========================
// PUPPETEER (SINGLETON)
// =========================
async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      headless: "new",
      args: ["--no-sandbox"],
    });
  }
  return browserInstance;
}

// =========================
// PDF
// =========================
async function createPDF(file, data, info, templateFn, options = {}) {
  const { width = "80mm", height = null } = options;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const html = templateFn(data, info);
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfOptions = {
      path: file,
      width,
      margin: 0,
      printBackground: true,
      preferCSSPageSize: true,
    };

    if (height) {
      pdfOptions.height = height;
      pdfOptions.pageRanges = "1";
    }

    await page.pdf(pdfOptions);
  } finally {
    await page.close();
  }
}

// =========================
// PRINT
// =========================
function printFile(file, printerName, options = {}) {
  return new Promise((resolve, reject) => {
    const platform = os.platform();

    if (platform === "win32") {
      winPrint(file, {
        printer: printerName,
        paperSize: options.paperSize,
        orientation: options.orientation,
      })
        .then(resolve)
        .catch(reject);
    } else if (platform === "linux") {
      const cmd = printerName
        ? `lp -d "${printerName}" "${file}"`
        : `lp "${file}"`;

      exec(cmd, (err, stdout) => {
        if (err) return reject(err);
        resolve(stdout);
      });
    } else {
      reject("OS không hỗ trợ");
    }
  });
}

// =========================
// RETRY
// =========================
async function retry(fn, retries = 2) {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    return retry(fn, retries - 1);
  }
}


// =========================
// IMAGE CACHE
// =========================
async function loadImageToBase64(url) {

  if (!url) return "";

  const cached = imageCache.get(url);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 5000,
    });

    const type = res.headers["content-type"];
    const base64 = Buffer.from(res.data).toString("base64");
    const result = `data:${type};base64,${base64}`;

    imageCache.set(url, { data: result, time: Date.now() });
    return result;
  } catch {
    console.error(err);
    return "";
  }
}

// =========================
// HANDLE PRINT
// =========================
async function handlePrint(order) {
  const config = getConfig();
  const jobs = [];

  if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
  }

  // CUSTOMER
  if (config.printers.customer && hasData(order.customer)) {
    const file = path.join(PDF_DIR, `customer_${Date.now()}.pdf`);

    const img = await loadImageToBase64(order.info?.qr_code);
    if (order.info) order.info.qr_code = img;

    order.info.order_number = order.customer.order_number;

    try {
      await createPDF(file, order.customer, order.info, customerTemplate);
    } catch (err) {
      console.error("Customer PDF error:", err);
    }

    jobs.push(
      retry(() => printFile(file, config.printers.customer))
        .then(async () => {
          try {
            await new Promise(r => setTimeout(r, 300));
            if (order.info?.payment === "Tiền mặt") {
              await openDrawer(config.printers.customer);
            }
          } catch (err) {
            console.error("Lỗi mở két:", err.message);
          }
          safeDelete(file)
        })
        .catch(err => {
          safeDelete(file);
        })
    );
  }

  // KITCHEN
  if (config.printers.kitchen && hasData(order.kitchen)) {
    const file = path.join(PDF_DIR, `kitchen_${Date.now()}.pdf`);

    try {
      await createPDF(file, order.kitchen, order.info, kitchenTemplate);
    } catch (err) {
      console.error("Kitchen PDF error:", err);
    }

    jobs.push(
      retry(() => printFile(file, config.printers.kitchen))
        .then(() => safeDelete(file))
        .catch(err => {
          safeDelete(file);
        })
    );
  }

  // BAR (TEM)
  if (config.printers.bar && hasData(order.bar)) {
    for (let i = 0; i < order.bar.length; i++) {
      const item = order.bar[i];
      const qty = item.quantity || 1;

      for (let j = 0; j < qty; j++) {
        const file = path.join(
          PDF_DIR,
          `bar_${Date.now()}_${i}_${j}.pdf`
        );

        try {
          await createPDF(file, item, order.info, barTemplate, {
            width: "50mm",
            height: "30mm",
          });
        } catch (err) {
          console.error("Bar PDF error:", err);
        }

        jobs.push(
          retry(() =>
            printFile(file, config.printers.bar, {
              paperSize: "Tem",
              orientation: "landscape",
            })
          ).then(() => safeDelete(file))
          .catch(err => {
          safeDelete(file);
        }));
      }
    }
  }

  await Promise.all(jobs);
}

// =========================
// OPEN DRAWER
// =========================
function openDrawer(printerName) {
  return new Promise((resolve, reject) => {
    try {
      const file = path.join(PDF_DIR, "drawer.bin");
      const buffer = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]);
      fs.writeFileSync(file, buffer);
      const hostname = require("os").hostname();
      const cmd = `copy /b "${file}" "\\\\${hostname}\\${printerName}"`;
      exec(cmd, (err) => {
        if (err) {
          console.error("Lỗi mở két:", err.message);
          return reject(err);
        }
        resolve(true);
      });
    } catch (err) {
      reject(err);
    }
  });
}

// =========================
// API
// =========================
app.get("/printers", async (req, res) => {
  try {
    res.json(await getPrinters());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/config", (req, res) => {
  res.json(getConfig());
});

app.post("/set-config", (req, res) => {
  const data = req.body;
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "Phải là array" });
  }

  const config = getConfig();

  data.forEach(item => {
    if (item.type === "print") {
      config.printers[item.printerType] = item.printerName;
    }
    if (item.type === "firebase") {
      config.firebase = {
        api: item.api,
        database: item.database,
      };
    }
  });

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  initFirebase();

  res.json({ success: true });
});

app.post("/print", async (req, res) => {
  try {
    await handlePrint(req.body);
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

  if (unsubscribe) unsubscribe();

  unsubscribe = onChildAdded(jobsRef, async (snapshot) => {
    const job = snapshot.val();
    const key = snapshot.key;

    if (!job || job.status !== "pending") return;

    try {
      const jobRef = ref(db, `print_jobs/${key}`);
      const claim = await runTransaction(jobRef, (current) => {
        if (!current || current.status !== "pending") return;

        const isProcessing = current.processing === true;
        const processingAt = current.processingAt || 0;
        const isStale = isProcessing && Date.now() - processingAt > FIREBASE_STALE_PROCESSING_MS;

        if (isProcessing && !isStale) return;

        return {
          ...current,
          processing: true,
          processingAt: Date.now(),
          processingBy: INSTANCE_ID,
        };
      });

      if (!claim.committed || claim.snapshot.val()?.processingBy !== INSTANCE_ID) {
        return;
      }

      await handlePrint(claim.snapshot.val());

      await update(jobRef, {
        status: "done",
        processing: false,
        doneAt: Date.now(),
      });
    } catch (err) {
      await update(ref(db, `print_jobs/${key}`), {
        status: "error",
        processing: false,
        error: err.message,
      });
    }
  }, (err) => {
    console.error("Firebase listener lỗi:", err.message);
    scheduleFirebaseRetry();
  });
}

// =========================
// START
// =========================
serverInstance = app.listen(3242, () => {
  console.log("Server chạy tại http://localhost:3242");
});

serverInstance.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error("Port 3242 đang được dùng. Có thể PrintServer đã chạy sẵn.");
    process.exit(0);
  }

  console.error("Server lỗi:", err.message);
});

initFirebase();
