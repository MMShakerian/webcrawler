BOT_NAME = "webcrawler"

SPIDER_MODULES = ["webcrawler.spiders"]
NEWSPIDER_MODULE = "webcrawler.spiders"

# Obey robots.txt rules
ROBOTSTXT_OBEY = True

# Set logging level to reduce verbosity
LOG_LEVEL = 'INFO'
LOG_ENABLED = False  # غیرفعال کردن لاگ‌های Scrapy

# MongoDB settings
MONGO_URI = "mongodb://localhost:27017"
MONGO_DB = "web_crawler"

# Set settings whose default value is deprecated to a future-proof value
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
FEED_EXPORT_ENCODING = "utf-8"
