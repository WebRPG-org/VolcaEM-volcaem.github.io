// cardDetails.js

import {
    langIndex,
    localMode,
    allowNewlines,
    sellerMode,
} from './config.js';

import {
    currentGame,
} from './detect.js';

import {
    manager,
} from './card.js';

import {
    translations,
    applyTranslations,
    addToTranslationArray,
} from './translations.js';

import {
    gameTranslations,
} from './translations_games.js';

import {
    currentDisplayedCards,
    reverseCurrentDisplayedCards,
    loadedFile,
} from './dynamic.js';

import {
    getTypeDisplay,
    getQualityBadge,
    getEditionBadge,
    getLanguageBadge,
} from './badges.js';

import {
    loadCSVAndDisplayCards,
    displayCards,
} from './csv.js';

import {
    precomputeNumericFields,
    comparators,
    getCardSortIndexChanges,
} from './sort.js';

import {
    renderAllCharts
} from './canvas.js';

export const cardId = getQueryParam("id");

////////////////////////////////
// Helper Functions and Dictionary
////////////////////////////////

export function ensureTranslationsReady() {
    if (currentGame) {
        const entries = gameTranslations[currentGame.toLowerCase()] || [];
        entries.forEach(([key, en, it]) =>
            addToTranslationArray(key, en, it)
        );
    }
}

// Function to reset all filter controls
export function resetFilters() {

    // --- Safely set language selector ---
    if (typeof langIndex === "number" && translations?.[langIndex]) {
        const selLang = document.getElementById("selectedLanguage");
        if (selLang) selLang.selectedIndex = langIndex;
    }

    // --- Safe helper ---
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    };

    const setChecked = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.checked = value;
    };

    // --- Reset all filters safely ---
    setValue("filterName", "");
    setValue("filterType", "");
    setValue("filterRarity", "");
    setValue("filterQuality", "");
    setValue("filterLanguage", "");
    setValue("filterEdition", "");
    setValue("sortBy", "");
    setValue("packOptions", "");
    setValue("locationOptions", "");

    setChecked("debugCheckbox", false);
    setChecked("duplicatesCheckbox", true);
    setChecked("invertFilterCheckbox", false);

    // Reset sort index if element exists
    const sortEl = document.getElementById("sortBy");
    if (sortEl) sortEl.selectedIndex = 0;
}



export function handleApplyFilters() {

    if (!loadedFile) return;

    ensureTranslationsReady();
    maybeApplyLanguage();

    const filters = collectFiltersFromDOM();
    let cards = manager.filterCards(filters);

    // Determine sorting
    const sortBy = document.getElementById("sortBy").value;

    // Precompute numeric fields for every card
    cards.forEach(precomputeNumericFields);

    const comparator = comparators[sortBy];
    if (comparator && typeof comparator === "function") {
        cards.sort(comparator);
    } else if (sortBy === "rarity") {
        const changes = getCardSortIndexChanges(cards);
        cards = changes.map(change => cards[change.from]);
    }

    // Render card grid/table
    displayCards(cards);

    renderAllCharts(currentDisplayedCards || []);
}

// Apply translation if the selected language changed
function maybeApplyLanguage() {
    const sel = document.getElementById("selectedLanguage");
    if (!sel) return;

    const idx = sel.selectedIndex;
    if (idx !== langIndex) applyTranslations(idx);
}

// Gather all filter values from the DOM
function collectFiltersFromDOM() {
    function getVal(id) {
        const el = document.getElementById(id);
        return el ? el.value : "";
    }

    return {
        name: getVal("filterName"),
        type: getVal("filterType"),
        rarity: getVal("filterRarity"),
        quality: getVal("filterQuality"),
        language: getVal("filterLanguage"),
        edition: getVal("filterEdition")
    };
}

export function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

export function displayCardDetails(cards) {
    if (localMode) {
        const container = document.getElementById("cardDetails");
        container.innerHTML = ''; // Clear existing content

        // Use the first card's common details
        const commonCard = cards[0];
		// Compute total spent and number of copies
		const totalPaid = cards.reduce((sum, c) => sum + (c.pricePaid || 0), 0);
		const copyCount = cards.length;


        // Collect all unique IDs and Pack IDs
        const allIds = [...new Set(cards.map(c => c.id))].join(", ");
        const allPackIds = [...new Set(cards.map(c => c.packId))].join(", ");

        container.innerHTML += `
      <div class="common-card">
        <h2>${commonCard.name} (${cards.length} elements)</h2>
        <br>
        <img src="${commonCard.getImageUrl()}" alt="${commonCard.name}" onclick="window.location.href='index.html'"><br>
        <br>
        <div class="detail-row"><span class="detail-label">Type:</span> ${getTypeDisplay(commonCard.type)}</div>
        <div class="detail-row"><span class="detail-label">IDs:</span> ${allIds}</div>
        <div class="detail-row"><span class="detail-label">Pack IDs:</span> ${allPackIds}</div>
		<div class="detail-row">
		  <span class="detail-label">Total Paid:</span> €${totalPaid.toFixed(2)} for ${copyCount} copies
		</div>
		<br>
        ${
          commonCard.wikiUrl
            ? '<div class="detail-row"><button onclick="window.open(\'' +
              commonCard.wikiUrl +
              '\', \'_blank\')">Wiki</button></div>'
            : ''
        }
      </div>
      <br>
    `;

        // Per-card details
        cards.forEach((card) => {
            let cleanedMarketPrice = (card.marketPrice || "")
                .replaceAll("⬆️", "")
                .replaceAll("⬇️", "")
                .replaceAll("➡️", "")
                .replaceAll("None", "")
                .trim();

            const marketPriceNumber = parseFloat(cleanedMarketPrice.replaceAll(",", "."));

            // Build optional fields
            const marketPriceHTML =
                marketPriceNumber && marketPriceNumber !== 0 ?
                `<div class="detail-row"><span class="detail-label">Market Price:</span> €${cleanedMarketPrice}</div>` :
                "";

            const commentsHTML =
                card.comments && card.comments.trim() !== "" ?
                `<div class="detail-row"><span class="detail-label">Comments:</span> ${card.comments}</div>` :
                "";

            container.innerHTML += `
    <hr>
    <br>
    <div class="version-entry">
      <div class="detail-row"><span class="detail-label">Rarity:</span> ${card.rarity}</div>
      <div class="detail-row"><span class="detail-label">Quality:</span> ${getQualityBadge(card.quality)}</div>
      <div class="detail-row"><span class="detail-label">Language:</span> ${getLanguageBadge(card.language)}</div>
      <div class="detail-row"><span class="detail-label">Edition:</span> ${getEditionBadge(card.edition)}</div>
      <div class="detail-row"><span class="detail-label">Price I Paid:</span> €${card.pricePaid.toFixed(2)}</div>
      ${marketPriceHTML}
      <div class="detail-row"><span class="detail-label">Obtained:</span> ${card.dateObtained}</div>
      <div class="detail-row"><span class="detail-label">Location:</span> ${card.location}</div>
      ${commentsHTML}
      <br>
    </div>
  `;
        });

    }
}

export function initCardDetailsPage(myfile) {
    if (!cardId) {
        document.getElementById("cardDetails").textContent = "No card ID provided.";
        return;
    }

    if (localMode) {
        fetch(myfile)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to load CSV: ${res.status} ${res.statusText}`);
                }
                return res.text();
            })
            .then(csvText => {
                if (!csvText.trim()) {
                    throw new Error("CSV file is empty or unreadable.");
                }

                manager.loadCards(csvText);

                const cards = manager.findCardsByIdOrName(cardId); // Your lookup method
                if (!cards || cards.length === 0) {
                    document.getElementById("cardDetails").textContent = "Card not found.";
                } else {
                    displayCardDetails(cards);
                }
            })
            .catch(err => {
                console.error("Error loading CSV file:", err);
                const el = document.getElementById("cardDetails");
                if (el) {
                    el.innerHTML = `<p style="color:white; text-align:center;">
            Unable to load card details.<br>${err.message}
          </p>`;
                }
            });
    }
}


export function updateThemeButtonLabel(mybutton, theme) {
    console.log("Updating theme button label to " + theme);
    mybutton.textContent =
        theme === "dark" ? "✨ ☀️" : "✨ 🌑";
    console.log("toggleBtn.textContent is now: " + mybutton.textContent);
}

export function initCollectionPage() {
    resetFilters();

    if (allowNewlines === false) {
        document.body.style.zoom = "90%";
    }

    if (localMode) {
        const params = new URLSearchParams(window.location.search);
        const csvFileParam = params.get("file");

        // Fallback if no param provided
        const csvFile = csvFileParam ? decodeURIComponent(csvFileParam) : 'cards.csv';

        loadCSVAndDisplayCards(csvFile);
    }

    const applyFiltersBtn = document.getElementById("applyFilters");
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener("click", handleApplyFilters);
    }

    // New: Add event listener for the reverse button.
    const reverseBtn = document.getElementById("reverseOrder");
    if (reverseBtn) {
        reverseBtn.addEventListener("click", () => {
            if (!loadedFile) return;
            if (currentDisplayedCards && currentDisplayedCards.length) {
                reverseCurrentDisplayedCards();
                displayCards(currentDisplayedCards);
            }
        });
    }

    if (!localMode) {
        const loadCSVButton = document.getElementById("loadCSV");
        if (loadCSVButton) {
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = ".csv";
            fileInput.style.display = "none";
            loadCSVButton.addEventListener("click", () => fileInput.click());
            fileInput.addEventListener("change", () => {
                if (!fileInput.files || fileInput.files.length === 0) {
                    alert("You must select a CSV file!");
                    return;
                }
                const file = fileInput.files[0];
                const fileURL = URL.createObjectURL(file);
                loadCSVAndDisplayCards(fileURL);
            });
        }
    }

    // Add event listener for the "Show Debug" checkbox.
    const debugCheck = document.getElementById("debugCheckbox");
    if (debugCheck) {
        debugCheck.addEventListener("change", function() {
            const debugDiv = document.getElementById("debugInfo");
            debugDiv.style.display = this.checked ? "block" : "none";
        });
    }

    const root = document.documentElement;
    const toggleBtn = document.getElementById("theme-toggle");

    // Read stored theme, default to light
    const storedTheme = localStorage.getItem("theme") || "light";
    console.log("Initializing theme:", storedTheme);
    root.setAttribute("data-theme", storedTheme);
}

export function doInit() {
    if (localMode === false) {
        let csvload = document.getElementById("loadCSV");
		if(csvload) {
			csvload.style.display = "block";
		}
    }

    initCollectionPage();

    if (sellerMode) {
        let thmarket = document.getElementById("thMarket");
		if(thmarket) {
			thmarket.setAttribute("data-translation-key", "tableMarketSeller");
		}

        let thPricePaid = document.getElementById("thSpent");
		if(thPricePaid) {
			thPricePaid.style.height = "0px";
			thPricePaid.style.width = "0px";
			thPricePaid.style.display = "none";
			thPricePaid.style.opacity = "0%";
		}

        let thDate = document.getElementById("thDate");
		if(thDate) {
			thDate.style.height = "0px";
			thDate.style.width = "0px";
			thDate.style.display = "none";
			thDate.style.opacity = "0%";
		}

        let thLocation = document.getElementById("thLocation");
		if(thLocation) {
			thLocation.style.height = "0px";
			thLocation.style.width = "0px";
			thLocation.style.display = "none";
			thLocation.style.opacity = "0%";
		}

        let thWiki = document.getElementById("thWiki");
		if(thWiki) {
			thWiki.style.height = "0px";
			thWiki.style.width = "0px";
			thWiki.style.display = "none";
			thWiki.style.opacity = "0%";
		}
    }

    // Apply translations using the selected language.
    applyTranslations(langIndex);

    const toggleBtn = document.getElementById("theme-toggle");

    if (!toggleBtn) {
        console.warn("#theme-toggle button not found.");
        return;
    }

    const storedTheme = localStorage.getItem("theme") || "light";
    updateThemeButtonLabel(toggleBtn, storedTheme);

    toggleBtn.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme");
        const nextTheme = current === "dark" ? "light" : "dark";
        console.log("Switching theme:", current, "→", nextTheme);

        document.documentElement.setAttribute("data-theme", nextTheme);
        localStorage.setItem("theme", nextTheme);
        updateThemeButtonLabel(toggleBtn, nextTheme);
    });
}

export function clickHandler(card, checkname = false) {
    // Build the base URL
    let url = `card.html?id=${encodeURIComponent(card.id)}`;

    // If the caller passed true, add the checkname flag
    if (checkname) {
        url += "&checkname"; // or `&checkname=true` for explicit value
    }

    // See if current page URL has a ?file=... query
    const params = new URLSearchParams(window.location.search);
    const fileParam = params.get("file");
    if (fileParam) {
        // Append with proper encoding
        url += `&file=${encodeURIComponent(fileParam)}`;
    }

    // Debug log to confirm
    console.log("[clickHandler] Opening:", url);

    // Open in a new tab/window
    window.open(url, "_blank", "noopener");
}