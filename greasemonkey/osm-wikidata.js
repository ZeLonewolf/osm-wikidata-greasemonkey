// ==UserScript==
// @name         Wikidata QID Augmentation with Wikipedia Links
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Augment Wikidata QIDs with labels and add Wikipedia links on the webpage
// @author       You
// @match        *://*openstreetmap.org/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    console.log("Wikidata QID Augmentation script with Wikipedia links started");

    function fetchLabelAndLink(qid, element) {
        console.log(`Fetching label and link for QID: ${qid}`);
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=labels|sitelinks|claims|descriptions&languages=en&sitefilter=enwiki&format=json`,
            onload: function(response) {
                if (response.readyState !== "complete") {
                    console.error(`Request not complete for QID: ${qid}, Ready State: ${response.readyState}`);
                    return;
                }

                try {
                    // Directly use responseText as an object
                    const responseData = response.responseText;
                    if (responseData.entities && responseData.entities[qid]) {
                        const entity = responseData.entities[qid];
                        const label = entity.labels.en && entity.labels.en.value;
                        const description = entity.descriptions.en && entity.descriptions.en.value;
                        console.log(`Description: ${description}`); // Log the description
                        const hasIcon = entity.claims["P8972"] || entity.claims["P154"];
                        displayLabelAndLink(qid, label, description, hasIcon, entity.sitelinks.enwiki.title, element);
                    } else {
                        console.log(`No label or sitelink found for QID: ${qid}`);
                    }
                } catch (error) {
                    console.error(`Error processing response for QID: ${qid}`, error, 'Response:', response.responseText);
                }
            },
            onerror: function(error) {
                console.error(`Error fetching label and link for QID: ${qid}`, error);
            }
        });
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

        if(hasIcon) {
            const brandIcon = document.createElement('img');
            brandIcon.src = `https://hub.toolforge.org/${qid}?p=P8972,P154&w=32&h=32`;
            brandIcon.style.height = 32;
            brandIcon.style.display = 'block'; // New line for QID
            brandIcon.style.float = 'left'; // New line for QID
            brandIcon.style.marginRight = '8px';
            newCell.appendChild(brandIcon);
        }

        // Create and add the Wikipedia icon
        if(!hasIcon) {
            const wikiIcon = document.createElement('img');
            wikiIcon.src = 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Wikipedia_app_icon.jpg';
            wikiIcon.style.height = '20px'; // Adjust size as needed
            wikiIcon.style.marginRight = '4px';
            newCell.appendChild(wikiIcon);
        }

        const wikiText = document.createElement('span');
        wikiText.innerHTML = `<a href="${getWikipediaUrl(wikipediaLink)}">${wikipediaLink}</a>`;
        newCell.appendChild(wikiText);

        const wikiDescription = document.createElement('span');
        wikiDescription.style.fontSize = '80%'; // Smaller text for QID
        wikiDescription.style.display = 'block'; // New line for QID
        wikiDescription.innerText = description;
        newCell.appendChild(wikiDescription);

        // Insert the new row after the parent row
        parentRow.parentNode.insertBefore(newRow, parentRow.nextSibling);
    }

    // Find all QID links and process them
    const qidLinks = document.querySelectorAll('a[href*="//www.wikidata.org/entity/Q"]');
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


    function getWikipediaUrl(title) {
        // Replace spaces with underscores
        var formattedTitle = title.split(' ').join('_');

        // Create the Wikipedia URL
        var url = 'https://en.wikipedia.org/wiki/' + encodeURIComponent(formattedTitle);

        return url;
    }

})();