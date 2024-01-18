// ==UserScript==
// @name         Wikidata QID Augmentation with Wikipedia Links
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Augment Wikidata QIDs with labels and add Wikipedia links on the webpage
// @author       You
// @match        *://*openstreetmap.org/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

const lang = navigator.language.split("\-")[0];
const FIND_QID = 'a[href*="//www.wikidata.org/entity/Q"]';

(function() {
    'use strict';

    console.log("Wikidata QID Augmentation script with Wikipedia links started");


    // Find all QID links and process them
    const qidLinks = document.querySelectorAll(FIND_QID);
    console.log(`Found ${qidLinks.length} QID links`);
    qidLinks.forEach(link => {
        const qidMatch = link.href.match(/Q\d+/);
        if (qidMatch) {
            const qid = qidMatch[0];
            fetchLabelAndLink(qid, link);
        } else {
            console.log("No QID found in link:", link);
        }
    });

})();

function fetchLabelAndLink(qid, element) {
    console.log(`Fetching label and link for QID: ${qid}`);
    GM_xmlhttpRequest({
        method: "GET",
        url: `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=labels|sitelinks|claims|descriptions&languages=${lang}&sitefilter=${lang}wiki&format=json`,
        onload: function(response) {
            if (response.readyState !== "complete") {
                console.error(`Request not complete for QID: ${qid}, Ready State: ${response.readyState}`);
                return;
            }

            try {
                processResponseData(response.responseText);
            } catch (error) {
                console.error(`Error processing response for QID: ${qid}`, error, 'Response:', response.responseText);
            }
        },
        onerror: function(error) {
            console.error(`Error fetching label and link for QID: ${qid}`, error);
        }
    });
}

function processResponseData(responseData) {
    if (responseData.entities && responseData.entities[qid]) {
        const entity = responseData.entities[qid];
        const label = entity.labels.en && entity.labels[lang].value;
        const description = entity.descriptions.en && entity.descriptions[lang].value;
        console.log(`Description: ${description}`); // Log the description
        const hasIcon = entity.claims["P8972"] || entity.claims["P154"];
        displayLabelAndLink(qid, label, description, hasIcon, entity.sitelinks[`${lang}wiki`]?.title, element);
    } else {
        console.log(`No label or sitelink found for QID: ${qid}`);
    }
}

function displayLabelAndLink(qid, label, description, hasIcon, wikipediaLink, element) {
    // Create a container for the label and QID
    const labelContainer = document.createElement('div');

    // Create and style the label span
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    labelContainer.appendChild(labelSpan);

    // Create and style the QID span
    const qidSpan = document.createElement('span');
    qidSpan.textContent = `[${element.textContent}]`;
    qidSpan.style.fontSize = '70%'; // Smaller text for QID
    qidSpan.style.display = 'block'; // New line for QID

    // Append the QID below the label
    labelContainer.appendChild(qidSpan);

    // Replace the original link text with the label container
    element.textContent = ''; // Clear the existing content
    element.appendChild(labelContainer);

    // Find the parent row of the current cell
    const parentRow = element.closest('tr');

    // Create a new row with a colspan=2 cell
    const newRow = document.createElement('tr');
    const newCell = document.createElement('td');
    newCell.setAttribute('colspan', '2');
    newCell.style.backgroundColor = '#eeeeff';
    newRow.appendChild(newCell);

    if (hasIcon) {
        const brandIcon = document.createElement('img');
        brandIcon.src = `https://hub.toolforge.org/${qid}?p=P8972,P154&w=32&h=32`;
        brandIcon.style.height = 32;
        brandIcon.style.display = 'block'; // New line for QID
        brandIcon.style.float = 'left'; // New line for QID
        brandIcon.style.marginRight = '8px';
        newCell.appendChild(brandIcon);
    }

    // Create and add the Wikipedia icon
    if (!hasIcon && wikipediaLink) {
        const wikiIcon = document.createElement('img');
        wikiIcon.src = 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Wikipedia_app_icon.jpg';
        wikiIcon.style.height = '20px'; // Adjust size as needed
        wikiIcon.style.marginRight = '4px';
        newCell.appendChild(wikiIcon);
    }

    if (wikipediaLink) {
        const wikiText = document.createElement('span');
        wikiText.innerHTML = `<a href="${getWikipediaUrl(wikipediaLink)}">${wikipediaLink}</a>`;
        newCell.appendChild(wikiText);
    }

    const wikiDescription = document.createElement('span');
    wikiDescription.style.fontSize = '80%'; // Smaller text for QID
    wikiDescription.style.display = 'block'; // New line for QID
    wikiDescription.innerText = description;
    newCell.appendChild(wikiDescription);

    // Insert the new row after the parent row
    parentRow.parentNode.insertBefore(newRow, parentRow.nextSibling);
}

function getWikipediaUrl(title) {
    // Replace spaces with underscores
    var formattedTitle = title.split(' ').join('_');

    // Create the Wikipedia URL
    var url = 'https://en.wikipedia.org/wiki/' + encodeURIComponent(formattedTitle);

    return url;
}

// Function to handle what happens when mutations are observed
function handleMutations(mutations, observer) {
    for (let mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check and process new nodes here, similar to how you process them on page load
            processNewNodes(mutation.addedNodes);
        }
    }
}

// Create the observer
const observer = new MutationObserver(handleMutations);

// Observer options
const config = {
    childList: true,
    subtree: true
};

// Start observing a target node
const targetNode = document.querySelector('#sidebar_content');
if (targetNode) {
    observer.observe(targetNode, config);
}

function processNewNodes(addedNodes) {
    addedNodes.forEach(node => {
        // Check if the node is an element node (and not text node, etc.)
        if (node.nodeType === Node.ELEMENT_NODE) {
            // Find all the Wikidata QID links within the node
            const wikidataLinks = node.querySelectorAll(FIND_QID);
            wikidataLinks.forEach(wikidataLink => {
                const qidMatch = wikidataLink.href.match(/Q\d+/);
                if (qidMatch) {
                    const qid = qidMatch[0];
                    fetchLabelAndLink(qid, wikidataLink);
                }
            });
        }
    });
}