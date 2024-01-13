// ==UserScript==
// @name         Wikidata QID Augmentation
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Augment Wikidata QIDs with labels on the webpage
// @author       You
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    console.log("Wikidata QID Augmentation script started");

function fetchLabel(qid, element) {
    console.log(`Fetching label for QID: ${qid}`);
    GM_xmlhttpRequest({
        method: "GET",
        url: `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=labels&languages=en&format=json`,
        onload: function(response) {
            if (response.readyState !== "complete") {
                console.error(`Request not complete for QID: ${qid}, Ready State: ${response.readyState}`);
                return;
            }

            try {
                // Directly use responseText as an object
                const responseData = response.responseText;
                if (responseData.entities && responseData.entities[qid].labels.en) {
                    const label = responseData.entities[qid].labels.en.value;
                    displayLabel(label, element);
                } else {
                    console.log(`No label found for QID: ${qid}`);
                }
            } catch (error) {
                console.error(`Error processing response for QID: ${qid}`, error, 'Response:', response.responseText);
            }
        },
        onerror: function(error) {
            console.error(`Error fetching label for QID: ${qid}`, error);
        }
    });
}


function displayLabel(label, element) {
    // Create a container for the label and QID
    const labelContainer = document.createElement('div');

    // Create and style the label span
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    labelContainer.appendChild(labelSpan);

    // Create and style the QID span
    const qidSpan = document.createElement('span');
    qidSpan.textContent = `[${element.textContent}]`;
    qidSpan.style.fontSize = '70%'; // Use 'smaller', a percentage, or a specific font-size if you want it even smaller
    qidSpan.style.display = 'block'; // This makes it appear on a new line below the label

    // Append the QID below the label
    labelContainer.appendChild(qidSpan);

    // Replace the original link text with the label container
    element.textContent = ''; // Clear the existing content
    element.appendChild(labelContainer);
}


    // Find all QID links and process them
    const qidLinks = document.querySelectorAll('a[href*="//www.wikidata.org/entity/Q"]');
    console.log(`Found ${qidLinks.length} QID links`);
    qidLinks.forEach(link => {
        const qidMatch = link.href.match(/Q\d+/);
        if (qidMatch) {
            const qid = qidMatch[0];
            fetchLabel(qid, link);
        } else {
            console.log("No QID found in link:", link);
        }
    });
})();
