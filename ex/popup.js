document.getElementById('crawlForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const url = document.getElementById('url').value;
    const dbName = document.getElementById('dbName').value;
    const collectionName = document.getElementById('collectionName').value;

    // نمایش پیام شروع کرول
    document.getElementById('output').textContent = 'در حال استخراج لینک‌ها...';

    chrome.runtime.sendMessage(
        { action: "startCrawl", url, dbName, collectionName },
        response => {
            if (response.success) {
                document.getElementById('output').textContent = 'استخراج لینک‌ها به پایان رسید. در حال دریافت گزارش...';
                // فراخوانی تابع برای دریافت گزارش کرول بعد از اتمام کرول
                fetchCrawlReport();
            } else {
                document.getElementById('output').textContent = `خطا: ${response.error}`;
            }
        }
    );

    checkCrawlStatus();
});

// تابع برای دریافت و نمایش گزارش کرول
function fetchCrawlReport() {
    fetch('http://localhost:3000/download-report')
        .then(response => response.text())
        .then(data => {
            document.getElementById('output').textContent = data;
            fetchReportList();
        })
        .catch(error => {
            document.getElementById('output').textContent = `خطا: ${error.message}`;
        });
}

// تابع برای دریافت لیست گزارشات
function fetchReportList() {
    fetch('http://localhost:3000/list-reports')
        .then(response => response.json())
        .then(data => {
            const reportList = document.getElementById('reportList');
            reportList.innerHTML = '';
            data.reports.forEach(report => {
                const listItem = document.createElement('li');
                listItem.className = 'list-group-item';
                listItem.textContent = report;
                listItem.addEventListener('click', () => {
                    fetchReport(report);
                    // حذف کلاس active از آیتم‌های دیگر
                    document.querySelectorAll('.list-group-item').forEach(item => item.classList.remove('active'));
                    // اضافه کردن کلاس active به آیتم انتخابی
                    listItem.classList.add('active');
                });
                reportList.appendChild(listItem);
            });
        })
        .catch(error => {
            console.error(`خطا در دریافت لیست گزارشات: ${error.message}`);
        });
}

// تابع برای دریافت و نمایش گزارش انتخابی
function fetchReport(filename) {
    fetch(`http://localhost:3000/download-report/${filename}`)
        .then(response => response.text())
        .then(data => {
            document.getElementById('output').textContent = data;
        })
        .catch(error => {
            document.getElementById('output').textContent = `خطا: ${error.message}`;
        });
}

// تابع برای بررسی وضعیت کرول
function checkCrawlStatus() {
    fetch('http://localhost:3000/crawl-status')
        .then(response => response.json())
        .then(data => {
            if (data.isCrawling) {
                document.getElementById('crawlStatus').textContent = 'در حال استخراج لینک‌ها...';
                setTimeout(checkCrawlStatus, 2000); // بررسی مجدد بعد از 2 ثانیه
            } else {
                document.getElementById('crawlStatus').textContent = 'استخراج لینک‌ها به پایان رسید.';
            }
        })
        .catch(error => {
            document.getElementById('crawlStatus').textContent = `خطا: ${error.message}`;
        });
}

// فراخوانی تابع برای دریافت لیست گزارشات در بارگذاری اولیه
fetchReportList();
