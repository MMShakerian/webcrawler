import scrapy
from pymongo import MongoClient
from urllib.parse import urlparse
from scrapy.spidermiddlewares.httperror import HttpError
import os
from datetime import datetime
from scrapy import signals

class LinkSpider(scrapy.Spider):
    name = "link_spider"

    def __init__(self, start_url=None, db_name="web_crawler", collection_name="links4", *args, **kwargs):
        super().__init__(*args, **kwargs)

        if start_url:
            self.start_urls = [start_url]
        else:
            self.start_urls = ["https://www.example.com"]

        # اتصال به MongoDB
        self.client = MongoClient("mongodb://localhost:27017/")
        self.db = self.client[db_name]
        self.collection = self.db[collection_name]

        # مجموعه لینک‌های دیده‌شده
        self.seen_links = set()

        # متغیرهای شمارش
        self.total_links = 0
        self.duplicate_links = 0
        self.external_links = 0
        self.not_found_links = 0

        # دامنه اصلی سایت
        self.main_domain = urlparse(self.start_urls[0]).netloc

        # متغیر توقف
        self.paused = False

    @classmethod
    def from_crawler(cls, crawler, *args, **kwargs):
        spider = super(LinkSpider, cls).from_crawler(crawler, *args, **kwargs)
        crawler.signals.connect(spider.pause, signal=signals.spider_idle)
        crawler.signals.connect(spider.resume, signal=signals.spider_opened)
        return spider

    def parse(self, response):
        if self.paused:
            return  # توقف پردازش لینک‌ها

        if response.status == 404:
            return

        links = response.css('a::attr(href)').getall()
        for link in links:
            if self.paused:
                return  # جلوگیری از ارسال درخواست جدید

            full_url = response.urljoin(link.strip())
            parsed_url = urlparse(full_url)

            if full_url in self.seen_links:
                self.duplicate_links += 1
                continue

            self.seen_links.add(full_url)

            if parsed_url.netloc and parsed_url.netloc != self.main_domain:
                self.external_links += 1
                continue

            # ذخیره لینک در دیتابیس
            self.collection.insert_one({"url": full_url, "status": "pending"})
            self.total_links += 1

            # ارسال درخواست جدید فقط در صورتی که کرالر متوقف نشده باشد
            if not self.paused:
                yield scrapy.Request(
                    full_url,
                    callback=self.parse,
                    errback=self.handle_error
                )

    def handle_error(self, failure):
        if failure.check(HttpError):
            response = failure.value.response
            if response.status == 404:
                self.logger.info(f"404 error for {response.url}")
                self.collection.update_one({"url": response.url}, {"$set": {"status": "404"}})
                self.not_found_links += 1

    def pause(self):
        """متوقف کردن کرالر"""
        self.paused = True
        self.logger.info("Crawling paused.")
        self.crawler.engine.pause()

    def resume(self):
        """ادامه دادن کرالر"""
        self.paused = False
        self.logger.info("Crawling resumed.")
        self.crawler.engine.unpause()

    def closed(self, reason):
        stats = self.crawler.stats.get_stats()
        report = (
            f"\n📅 **تاریخ استخراج:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"🔗 **لینک استخراج:** {self.start_urls[0]}\n"
            f"🗄 **نام دیتابیس:** {self.db.name}\n"
            f"📂 **نام کلکشن:** {self.collection.name}\n\n"
            "📊 **گزارش نهایی کرول:**\n"
            f"**🔹 تعداد کل لینک‌های جدید استخراج‌شده:** {self.total_links}\n"
            f"**🔸 تعداد لینک‌های تکراری حذف‌شده:** {self.duplicate_links}\n"
            f"**⚠️ تعداد لینک‌های خارج از دامنه:** {self.external_links}\n"
            f"**❌ تعداد لینک‌های 404:** {self.not_found_links}\n\n"
            "📈 **آمار Scrapy:**\n"
            f"**🔹 تعداد کل درخواست‌ها:** {stats.get('downloader/request_count', 0)}\n"
            f"**🔸 تعداد پاسخ‌های دریافت‌شده:** {stats.get('downloader/response_count', 0)}\n"
            f"**⚠️ تعداد خطاهای دانلود:** {stats.get('downloader/exception_count', 0)}\n"
            f"**🔹 تعداد آیتم‌های اسکرپ‌شده:** {stats.get('item_scraped_count', 0)}\n"
            f"**🔸 حداکثر عمق درخواست‌ها:** {stats.get('request_depth_max', 0)}\n"
        )

        # ذخیره گزارش
        timestamp = datetime.now().strftime('%Y-%m-%dT%H-%M-%S')
        report_filename = f'report_{timestamp}.txt'
        report_path = os.path.join(os.path.dirname(__file__), '..', 'reports', report_filename)
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)

        latest_report_path = os.path.join(os.path.dirname(__file__), '..', 'reports', 'latest_report.txt')
        with open(latest_report_path, 'w', encoding='utf-8') as f:
            f.write(report)

        print(report)
        self.client.close()
