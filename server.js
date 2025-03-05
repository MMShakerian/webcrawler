const express = require('express');
const cors = require('cors'); // اضافه کردن CORS
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;

// فعال کردن CORS برای همه‌ی درخواست‌ها
app.use(cors());

// پشتیبانی از JSON
app.use(bodyParser.json());

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
        // بازگرداندن خروجی به اکستنشن
        res.json({ stdout, stderr });
    });
});

// اجرای سرور
app.listen(PORT, () => {
    console.log(`run server Node.js ${PORT}`);
});
