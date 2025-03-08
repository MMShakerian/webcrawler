const express = require('express');
const cors = require('cors'); // اضافه کردن CORS
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// فعال کردن CORS برای همه‌ی درخواست‌ها
app.use(cors());

// پشتیبانی از JSON
app.use(bodyParser.json());

let latestReport = "";
let isCrawling = false;
let isPaused = false;
let crawlProcess = null;

// ایجاد پوشه reports در صورت عدم وجود
const reportsDir = path.join(__dirname, 'webcrawler', 'reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

// Endpoint برای شروع کرول
app.post('/start-crawl', (req, res) => {
    const { url, dbName, collectionName } = req.body;

    const scrapyProjectPath = path.join(__dirname, 'webcrawler'); 
    const command = `scrapy crawl link_spider -a start_url="${url}" -a db_name="${dbName}" -a collection_name="${collectionName}"`;

    isCrawling = true;
    isPaused = false;

    crawlProcess = exec(command, { cwd: scrapyProjectPath });

    crawlProcess.stdout.on('data', (data) => {
        latestReport += data;
    });

    crawlProcess.stderr.on('data', (data) => {
        console.error(`خطای کرول: ${data}`);
    });

    crawlProcess.on('close', (code) => {
        console.log(`فرایند کرول با کد ${code} بسته شد`);
        isCrawling = false;
        crawlProcess = null;

        // ذخیره گزارش در فایل
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFilename = `report_${timestamp}.txt`;
        const reportPath = path.join(reportsDir, reportFilename);
        fs.writeFileSync(reportPath, latestReport);
        fs.writeFileSync(path.join(reportsDir, 'latest_report.txt'), latestReport);
    });

    // فقط یک پاسخ ارسال شود
    res.json({ message: 'کرول شروع شد' });
});


app.post('/pause-crawl', (req, res) => {
    if (isCrawling && crawlProcess) {
        crawlProcess.kill('SIGTERM');  // ارسال سیگنال برای توقف فرآیند Scrapy
        isPaused = true;
        isCrawling = false;  // وضعیت کرول رو تغییر بده
        crawlProcess = null;  // مقداردهی مجدد برای جلوگیری از اجرای مجدد کرول
        res.json({ message: 'کرول متوقف شد' });
    } else {
        res.status(400).json({ error: 'فرآیند کرول در حال اجرا نیست یا قبلاً متوقف شده است' });
    }
});


app.post('/resume-crawl', (req, res) => {
    if (isPaused) {
        isPaused = false;
        res.json({ message: 'کرول ادامه یافت' });
    } else {
        res.status(400).json({ error: 'فرآیند کرول متوقف نشده است' });
    }
});

// Endpoint برای بررسی وضعیت کرول
app.get('/crawl-status', (req, res) => {
    res.json({ isCrawling, isPaused });
});

// Endpoint برای دریافت گزارش آخرین کرول
app.get('/crawl-report', (req, res) => {
    res.json({ report: latestReport });
});

// Endpoint برای دریافت فایل گزارش آخرین کرول
app.get('/download-report', (req, res) => {
    const reportPath = path.join(reportsDir, 'latest_report.txt');
    if (fs.existsSync(reportPath)) {
        res.download(reportPath, 'latest_report.txt', (err) => {
            if (err) {
                console.error(`خطا در ارسال فایل: ${err.message}`);
                res.status(500).send('خطا در ارسال فایل');
            }
        });
    } else {
        res.status(404).send('گزارش یافت نشد');
    }
});

// Endpoint برای دریافت لیست گزارشات
app.get('/list-reports', (req, res) => {
    fs.readdir(reportsDir, (err, files) => {
        if (err) {
            console.error(`خطا در خواندن پوشه گزارشات: ${err.message}`);
            return res.status(500).send('خطا در خواندن پوشه گزارشات');
        }
        res.json({ reports: files });
    });
});

// Endpoint برای دریافت فایل گزارش
app.get('/download-report/:filename', (req, res) => {
    const reportPath = path.join(reportsDir, req.params.filename);
    res.download(reportPath, req.params.filename, (err) => {
        if (err) {
            console.error(`خطا در ارسال فایل: ${err.message}`);
            res.status(500).send('خطا در ارسال فایل');
        }
    });
});

// اجرای سرور
app.listen(PORT, () => {
    console.log(`run server Node.js ${PORT}`);
});
