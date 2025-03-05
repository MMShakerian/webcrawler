document.getElementById('crawlForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const url = document.getElementById('url').value;
    const dbName = document.getElementById('dbName').value;
    const collectionName = document.getElementById('collectionName').value;

    chrome.runtime.sendMessage(
        { action: "startCrawl", url, dbName, collectionName },
        response => {
            if (response.success) {
                document.getElementById('output').textContent = response.stdout || response.stderr;
            } else {
                document.getElementById('output').textContent = `خطا: ${response.error}`;
            }
        }
    );
});
