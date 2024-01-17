chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log("message");
        if (request.contentScriptQuery == "qid") {
            console.log(request);
            fetchLabelAndLink(sendResponse, request.qid, request.lang, request.link);
            return true; // Will respond asynchronously.
        }
    });

function fetchLabelAndLink(sendResponse, qid, lang, element) {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=labels|sitelinks|claims|descriptions&languages=${lang}&sitefilter=${lang}wiki&format=json`;
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok for QID: ${qid}`);
            }
            return response.json();
        })
        .then(sendResponse)
        .catch(error => console.error(`Error fetching label and link for QID: ${qid}`, error));
}

