const lang = navigator.language.split("\-")[0];
const FIND_QID = 'a[href*="//www.wikidata.org/entity/Q"]:not(.wdplugin)';

(function() {
    'use strict';
    // Find all QID links and process them
    processLinks(document.querySelectorAll(FIND_QID));
})();

function processLinks(links) {
    links.forEach(link => {
        const qidMatch = link.href.match(/Q\d+/);
        if (qidMatch) {
            const qid = qidMatch[0];
            chrome.runtime.sendMessage('', {
                contentScriptQuery: "qid",
                lang,
                qid,
                link
            }, {}, (response) => processResponseData(response, qid, lang, link));
        } else {
            console.log("No QID found in link:", link);
        }
    });
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
            processLinks(node.querySelectorAll(FIND_QID));
        }
    });
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

function processResponseData(responseData, qid, lang, element) {
    if (responseData.entities && responseData.entities[qid]) {
        const entity = responseData.entities[qid];

        // Try to get the label in the requested language, fallback to English
        const label = entity.labels[lang]?.value || entity.labels['en']?.value;

        // Try to get the description in the requested language, fallback to English
        const description = entity.descriptions[lang]?.value ?? entity.descriptions['en']?.value ?? '';

        const hasIcon = entity.claims["P8972"] || entity.claims["P154"] || entity.claims["P14"];
        displayLabelAndLink(qid, label, description, hasIcon, entity.sitelinks[`${lang}wiki`]?.title, element);
    } else {
        console.log(`No data found for QID: ${qid}`);
    }
}

function displayLabelAndLink(qid, label, description, hasIcon, wikipediaLink, element) {

    // Replace original QID with label
    element.textContent = label;

    // Create and style the QID span
    const qidSpan = document.createElement('span');
    qidSpan.style.fontSize = '70%'; // Smaller text for QID
    qidSpan.style.display = 'block'; // New line for QID

    // Create text node for the opening bracket
    const openingBracket = document.createTextNode('[');

    // Create the anchor element inside the QID span
    const qidAnchor = document.createElement('a');
    qidAnchor.className = 'wdplugin';
    qidAnchor.href = element.href;
    qidAnchor.textContent = qid; // Safely set the text content

    // Create text node for the closing bracket
    const closingBracket = document.createTextNode(']');

    // Append the opening bracket, anchor, and closing bracket to the span
    qidSpan.appendChild(openingBracket);
    qidSpan.appendChild(qidAnchor);
    qidSpan.appendChild(closingBracket);

    // Insert the QID span after the element
    element.insertAdjacentElement('afterend', qidSpan);
    element.insertAdjacentElement('afterend', document.createElement('br'));

    if(!hasIcon && !wikipediaLink && !description) {
        return;
    }

    // Find the parent row of the current cell
    const parentRow = element.closest('tr');

    // Create a new row with a colspan=2 cell
    const newRow = document.createElement('tr');
    const newCell = document.createElement('td');
    newCell.setAttribute('colspan', '2');
    newCell.style.backgroundColor = '#eeeeff';
    newRow.appendChild(newCell);

    // Create a div to serve as a flex container
    const flexContainer = document.createElement('div');
    flexContainer.style.display = 'flex';
    flexContainer.style.alignItems = 'flex-start'; // Align items to the top
    flexContainer.style.flexWrap = 'wrap'; // Allow wrapping when necessary
    newCell.appendChild(flexContainer);

    if (hasIcon) {
        const brandIcon = document.createElement('img');
        brandIcon.src = `https://hub.toolforge.org/${qid}?p=P8972,P154,P14&h=32&w=128`;
        brandIcon.style.height = `32px`;
        brandIcon.style.marginRight = '8px';
        brandIcon.style.flexShrink = '0'; // Icon should not shrink
        brandIcon.style.flexGrow = '0'; // Icon should not grow
        brandIcon.style.flexBasis = 'auto'; // Icon base size
        flexContainer.appendChild(brandIcon); // Append the icon to the flex container
    }

    // Create a div for text that stacks vertically
    const textStack = document.createElement('div');
    textStack.style.flexGrow = '1'; // Text container can grow if there is space
    textStack.style.flexShrink = '0'; // Text container should not shrink
    textStack.style.flexBasis = '50%'; // Text takes up at least 50% of the container
    flexContainer.appendChild(textStack); // Append the text stack to the flex container

    if (wikipediaLink) {
        const wikiText = document.createElement('a');
        wikiText.href = getWikipediaUrl(wikipediaLink);
        wikiText.textContent = wikipediaLink; // Using textContent for security and simplicity
        wikiText.style.display = 'block'; // Make the link display as block to fill width
        textStack.appendChild(wikiText); // Append to the text stack
    }

    const wikiDescription = document.createElement('div');
    wikiDescription.style.fontSize = '80%'; // Smaller text for QID
    wikiDescription.textContent = description; // Using textContent for security and simplicity
    wikiDescription.style.display = 'block'; // Make the description display as block
    textStack.appendChild(wikiDescription); // Append to the text stack

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
