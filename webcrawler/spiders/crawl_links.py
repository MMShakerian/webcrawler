import scrapy
from pymongo import MongoClient
from urllib.parse import urlparse
from scrapy.spidermiddlewares.httperror import HttpError

class LinkSpider(scrapy.Spider):
    name = "link_spider"

    # دریافت آرگومان‌های ورودی از خط فرمان
    def __init__(self, start_url=None, db_name="web_crawler", collection_name="links4", *args, **kwargs):
        super().__init__(*args, **kwargs)

        if start_url:
            self.start_urls = [start_url]
        else:
            self.start_urls = ["https://www.example.com"]

        # اتصال به MongoDB با استفاده از نام دیتابیس و کلکشن دریافتی
        self.client = MongoClient("mongodb://localhost:27017/")
        self.db = self.client[db_name]
        self.collection = self.db[collection_name]

        # مجموعه لینک‌هایی که قبلاً دیده‌ایم (برای بهبود سرعت)
        self.seen_links = set()

        # متغیرهای شمارش
        self.total_links = 0
        self.duplicate_links = 0
        self.external_links = 0
        self.not_found_links = 0  # شمارش لینک‌های 404

        # دامنه اصلی سایت
        self.main_domain = urlparse(self.start_urls[0]).netloc

    def parse(self, response):
        # اگر صفحه 404 بود، از پردازش آن صرف نظر کن
        if response.status == 404:
            return

        links = response.css('a::attr(href)').getall()

        for link in links:
            full_url = response.urljoin(link.strip())
            parsed_url = urlparse(full_url)

            # بررسی لینک تکراری بدون جستجو در دیتابیس
            if full_url in self.seen_links:
                self.duplicate_links += 1
                continue

            # اضافه کردن لینک به مجموعه دیده‌شده‌ها
            self.seen_links.add(full_url)

            # بررسی لینک‌های خارج از دامنه
            if parsed_url.netloc and parsed_url.netloc != self.main_domain:
                self.external_links += 1
                continue

            # ذخیره لینک جدید در دیتابیس
            self.collection.insert_one({"url": full_url, "status": "pending"})
            self.total_links += 1

            # ارسال درخواست با errback برای مدیریت خطاها مثل 404
            yield scrapy.Request(
                full_url,
                callback=self.parse,
                errback=self.handle_error
            )

    def handle_error(self, failure):
        # بررسی اینکه آیا خطا به دلیل کد 404 هست
        if failure.check(HttpError):
            response = failure.value.response
            if response.status == 404:
                self.logger.info(f"404 error for {response.url}")
                # به‌روزرسانی وضعیت لینک در دیتابیس
                self.collection.update_one({"url": response.url}, {"$set": {"status": "404"}})
                self.not_found_links += 1

    def closed(self, reason):
        # دسترسی به آمار Scrapy
        stats = self.crawler.stats.get_stats()

        # گزارش نهایی کرول
        report = (
            "\n📊 **گزارش نهایی کرول:**\n"
            f"🔹 تعداد کل لینک‌های جدید استخراج‌شده: {self.total_links}\n"
            f"🔸 تعداد لینک‌های تکراری حذف‌شده: {self.duplicate_links}\n"
            f"⚠️ تعداد لینک‌های خارج از دامنه: {self.external_links}\n"
            f"❌ تعداد لینک‌های 404: {self.not_found_links}\n\n"
            "📈 **آمار Scrapy:**\n"
            f"🔹 تعداد کل درخواست‌ها: {stats.get('downloader/request_count', 0)}\n"
            f"🔸 تعداد پاسخ‌های دریافت‌شده: {stats.get('downloader/response_count', 0)}\n"
            f"⚠️ تعداد خطاهای دانلود: {stats.get('downloader/exception_count', 0)}\n"
            f"🔹 تعداد آیتم‌های اسکرپ‌شده: {stats.get('item_scraped_count', 0)}\n"
            f"🔸 حداکثر عمق درخواست‌ها: {stats.get('request_depth_max', 0)}\n"
        )

        print(report)
        # بستن اتصال به دیتابیس
        self.client.close()
