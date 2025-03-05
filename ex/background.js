chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startCrawl") {
        fetch("http://127.0.0.1:3000/start-crawl", { // از 127.0.0.1 به‌جای localhost استفاده کن
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: message.url,
                dbName: message.dbName,
                collectionName: message.collectionName
            })
        })
        .then(response => response.json())
        .then(data => sendResponse({ success: true, stdout: data.stdout, stderr: data.stderr }))
        .catch(error => sendResponse({ success: false, error: error.message }));

        return true; // برای `sendResponse` آسینک، باید `return true` برگردونی
    }
});
