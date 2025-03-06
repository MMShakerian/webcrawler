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

// ایجاد پوشه reports در صورت عدم وجود
const reportsDir = path.join(__dirname, 'webcrawler', 'reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir);
}

// Endpoint برای شروع کرول
app.post('/start-crawl', (req, res) => {
    const { url, dbName, collectionName } = req.body;

    // مسیر پروژه Scrapy رو تنظیم کن
    const scrapyProjectPath = path.join(__dirname, 'webcrawler'); 
    const command = `scrapy crawl link_spider -a start_url="${url}" -a db_name="${dbName}" -a collection_name="${collectionName}"`;

    // اجرای فرمان
    exec(command, { cwd: scrapyProjectPath }, (error, stdout, stderr) => {
        if (error) {
            console.error(`خطا: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
        // ذخیره خروجی به عنوان گزارش آخرین کرول
        latestReport = stdout;
        // ذخیره گزارش در فایل با نام منحصر به فرد
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFilename = `report_${timestamp}.txt`;
        fs.writeFileSync(path.join(reportsDir, reportFilename), stdout);
        // بازگرداندن خروجی به اکستنشن
        res.json({ stdout, stderr });
    });
});

// Endpoint برای دریافت گزارش آخرین کرول
app.get('/crawl-report', (req, res) => {
    res.json({ report: latestReport });
});

// Endpoint برای دریافت فایل گزارش آخرین کرول
app.get('/download-report', (req, res) => {
    const reportPath = path.join(reportsDir, 'latest_report.txt');
    res.download(reportPath, 'latest_report.txt', (err) => {
        if (err) {
            console.error(`خطا در ارسال فایل: ${err.message}`);
            res.status(500).send('خطا در ارسال فایل');
        }
    });
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
