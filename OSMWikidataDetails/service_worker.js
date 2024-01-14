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
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=labels|sitelinks|claims|descriptions&languages=en&sitefilter=${lang}wiki&format=json`;
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

function processResponseData(responseData, qid, lang, element) {
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
