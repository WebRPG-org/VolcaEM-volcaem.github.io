import {
    langIndex,
    localMode,
    shouldShowImage,
    allowNewlines,
    useTallTr,
    useSmallTr,
    enableCollections,
    isUsingAndroidApp,
    isAndroidApp,
    sellerMode

} from './config.js';

import {
    currentDisplayedCards,
    setCurrentDisplayedCards,
    updateTotalSpent,
    setLoadedFile,
} from './dynamic.js';

import {
    currentGame,
} from './detect.js';

import {
    manager,
} from './card.js';

import {
    translations,
} from './translations.js';

import {
    getTypeDisplay,
    getQualityBadge,
    getRarityBadge,
    getLanguageBadge,
    getEditionBadge,
} from './badges.js';

import {
    showOverlay,
    updateOverlayPosition,
    hideOverlay,
} from './img.js';

import {
    updatePackStats,
    updateLocationStats,
    updateDebugOptions,
} from './debug.js';

import {
    renderAllCharts,
} from './canvas.js';

import {
    clickHandler,
} from './common.js';

// Cache globale: filename → src
const imageSrcCache = new Map();
// Cache globale: filename → ImageBitmap
const imageBitmapCache = new Map();

const pendingImagePromises = new Map();

// ---------- FORMAT RULES PER GIOCO ----------
export const formatRulesByGame = {
    "Yu-Gi-Oh": {
        "Default": { excludeTypes: [], allowedSetCodes: null, languageRule: null },
        "Genesys": { excludeTypes: ["Link", "Pendulum"], allowedSetCodes: null, languageRule: null },
        "GOAT": { excludeTypes: [], allowedSetCodes: null, languageRule: null },
		"GOAT2EDISON": { excludeTypes: [], allowedSetCodes: null, languageRule: null },
        "Edison": { excludeTypes: [], allowedSetCodes: null, languageRule: null },
		"Modern": { excludeTypes: [], allowedSetCodes: null, languageRule: null },
        "OCG": { excludeTypes: [], allowedSetCodes: null, languageRule: { type: "only", languages: ["JPN", "JP", "JA", "JAP", "AE", "KOR", "KR", "CHN", "ZH"] } },
        "TCG": { excludeTypes: [], allowedSetCodes: null, languageRule: { type: "exclude", languages: ["JPN", "JP", "JA", "JAP", "AE", "KOR", "KR", "CHN", "ZH"] } }
    },
    // aggiungi altri giochi se necessario
};

// Format stuff

export function extractSetCodeFromCardObj(card) {
    const pack = (card.packId || card["Pack ID"] || "").toString().trim();
    if (pack) return pack.toUpperCase();
    const id = (card.id || card.ID || "").toString().trim();
    const m = id.match(/^([A-Z0-9]+)-/i);
    return m ? m[1].toUpperCase() : "";
}

export function cardSetInWhitelist(card, allowedSetCodes) {
    if (!allowedSetCodes || allowedSetCodes.length === 0) return false;
    const setCode = extractSetCodeFromCardObj(card).toUpperCase();
    return allowedSetCodes.map(s => s.toUpperCase()).includes(setCode);
}

export function cardLanguageMatches(card, languageRule) {
    if (!languageRule) return true;
    const lang = (card.language || card.Language || "").toString().toUpperCase();
    if (languageRule.type === "only") {
        return languageRule.languages.map(l => l.toUpperCase()).includes(lang);
    } else if (languageRule.type === "exclude") {
        return !languageRule.languages.map(l => l.toUpperCase()).includes(lang);
    }
    return true;
}

export function isCardGoodForFormat(card, game, formatName, formatMap) {


    if (formatName === "Default") {
        return true;
    }

    if (card.rarity.toUpperCase().includes("FAKE") || card.rarity.toUpperCase().includes("FALSA")) {
        return false;
    }
	
	if(card.type.toUpperCase().includes("PRODUCT") || card.type.toUpperCase().includes("TOKEN")) {
		return false;
	}

    // --- OVERRIDE COMPLETO PER EDISON E GOAT ---
    if (game === "Yu-Gi-Oh") {
        const name = card.name || card.Name || "";

        if (formatName === "Edison") {
            return formatMap[name] === true;
        }

        if (formatName === "GOAT") {
            return formatMap[name] === true;
        }
		
		if (formatName === "GOAT2EDISON") {
            return formatMap[name] === true;
        }
		
		if (formatName === "Modern") {
            return formatMap[name] === true;
        }
    }


    // --- TUTTO IL RESTO RIMANE COME PRIMA ---
    const gameRules = formatRulesByGame[game] || {};
    const rules = gameRules[formatName] || gameRules["Default"] || { excludeTypes: [], allowedSetCodes: null, languageRule: null };
    const exclude = rules.excludeTypes || [];
    const allowedSets = rules.allowedSetCodes || null;
    const languageRule = rules.languageRule || null;

    const typeStr = Array.isArray(card.type) ? card.type.join(" ") : (card.type || "");
    if (exclude.some(exType => typeStr.includes(exType))) return false;

    if (allowedSets) {
        if (!cardSetInWhitelist(card, allowedSets)) return false;
    }

    if (rules.excludeSetCodes) {
        const setCode = extractSetCodeFromCardObj(card);
        if (rules.excludeSetCodes.includes(setCode)) return false;
    }

    if (!cardLanguageMatches(card, languageRule)) return false;

    return true;
}


// Function to load CSV data and display cards
export function loadCSVAndDisplayCards(myfile) {

    if (!myfile.includes(".")) {
        return;
    }

    fetch(myfile)
        .then(response => response.text())
        .then(csvText => {
            manager.loadCards(csvText);
            displayCards(manager.cards);

            updatePackStats();
            updateLocationStats();
            // Update the copy-only debug textareas.
            updateDebugOptions();
            setLoadedFile(true);
            let csvload = document.getElementById("loadCSV");
            if (csvload) {
                csvload.style.display = "none";
                //console.log("Set the display style of the CSV button to none");
            } else {
                //console.log("CSV load button is null");
            }
            renderAllCharts(currentDisplayedCards || []);
        })
        .catch(err => {
            console.error("Error loading CSV file:", err);
            const tbody = document.getElementById("cardBody");
            if (tbody) {
                tbody.innerHTML = "";
                const tr = document.createElement("tr");
                const td = document.createElement("td");
                td.setAttribute("colspan", "15");
                td.textContent = translations[langIndex]["csverror"];
                tr.appendChild(td);
                tbody.appendChild(tr);
            }
        });
}

export function getLocalImagePath(card) {
    const sanitizeFileName = (str) =>
        str.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[:#"\/\\?%*|<>]/g, '') // Remove unsupported symbols
        .trim()
        .replace(/\s+/g, '_') // Collapse spaces to underscores
        .replace(/_+/g, '_'); // Collapse multiple underscores

    const gameDir = sanitizeFileName(currentGame.replaceAll("-", "")).toLowerCase();
    const langDir = sanitizeFileName(card.language).toUpperCase();
    const idFile = sanitizeFileName(card.id);

    if (idFile.length === 0 && !card.getImageUrl().includes("common")) {
        return "";
    }

    if (card.getImageUrl().includes("..")) {
        return "";
    }

    if (isAndroidApp()) {
        // Assumes images are stored in: /storage/emulated/0/TCGCollection/images/...
        return `https://android.local/` + card.getImageUrl();
    } else {
        return card.getImageUrl();
    }

    return "";
}

function logMessage(msg) {
    const should_log = false;
    if (should_log) {
        const panel = document.getElementById("logPanel");
        if (panel) {
            if (panel.style.display == "none") {
                panel.style.display = "block";
            }
            const entry = document.createElement("div");
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
            panel.appendChild(entry);
            panel.scrollTop = panel.scrollHeight;
        }
    }
}

export function createStealthButton(label, mycards) {
    const btn = document.createElement("button");

    // Store the real value for click handling
    btn.dataset.value = label;

    // Add a class for styling and pseudo-element rendering
    btn.classList.add("tag-button");

    // Accessibility: screen readers still get the label
    btn.setAttribute("aria-label", label);

    // Click handler: filter cards by tag
    btn.addEventListener("click", (cards) => {
        const tag = btn.dataset.value;

        // Find all cards whose comments contain [tag]
        const matchingCards = manager.cards.filter(card =>
            card.comments && card.comments.replaceAll("{", "[").replaceAll("}", "]").includes(`[${tag}]`)
        );

        // For now, just log them — replace with your display logic
        //console.log(`Cards with [${tag}]:`, matchingCards);

        // Example: update the UI
        // renderCards(matchingCards);
        displayCards(matchingCards);
        window.scrollTo(0, 0);
    });

    return btn;
}

// Funzione ottimizzata senza async/await
export function getImageSrcForCard(card) {
    return new Promise((resolve) => {
        const filename = card.imageFilename;
        const srcKey = getLocalImagePath(card);

        // 1. Fallback immediato se non c'è filename
        if (!filename || typeof filename !== "string" || filename.length === 0) {
            resolve(srcKey);
            return;
        }

        // 2. Cache: filename → src
        if (imageSrcCache.has(filename)) {
            resolve(imageSrcCache.get(filename));
            return;
        }

        // 3. Deduplica: se esiste già una promise in corso
        if (pendingImagePromises.has(filename)) {
            pendingImagePromises.get(filename).then(resolve);
            return;
        }

        // 4. Deduplica anche per URL identico (nuovo!)
        if (imageSrcCache.has(srcKey)) {
            resolve(imageSrcCache.get(srcKey));
            return;
        }

        // 5. Caricamento immagine (singola richiesta)
        const promise = new Promise((res) => {
            const img = new Image();
            img.loading = "lazy"; // migliora la percezione

            img.src = srcKey;

            img.onload = () => {
                // Salva direttamente la src (niente bitmap, niente canvas)
                imageSrcCache.set(filename, img.src);
                imageSrcCache.set(srcKey, img.src);

                res(img.src);
            };

            img.onerror = () => {
                // Fallback: evita stringa vuota, usa comunque il path locale
                res(srcKey);
            };
        });

        // 6. Memorizza promise per deduplicare richieste concorrenti
        pendingImagePromises.set(filename, promise);

        // 7. Risoluzione finale
        promise.then((src) => {
            pendingImagePromises.delete(filename);

            if (src && src.length > 0 && !imageSrcCache.has(filename)) {
                imageSrcCache.set(filename, src);
            }

            resolve(src);
        });
    });
}

// Cache globale per i formati
const formatCache = {};

async function loadFormat(name) {
    if (formatCache[name]) return formatCache[name];
    const response = await fetch(name);
    const json = await response.json();
    formatCache[name] = json;
    return json;
}

// Pre-normalizzazione dei campi delle carte
function normalizeCard(card) {
    card._name = card.name.replace(/\\/g, "");
    card._rarity = (card.rarity || "").toLowerCase().trim();
    card._edition = (card.edition || "").replace(/None|NONE/g, "");
    card._id = (card.id || "").replace(/None|NONE/g, "");
    card._packId = (card.packId || "").replace(/None|NONE/g, "");
    card._date = card.dateObtained || "";
    card._location = card.location || "";
    card._comments = card.comments || "";
    return card;
}

// Display cards in the table.
export async function displayCards(cards) {
	
	cards = cards.map(normalizeCard);
	
    // Store a copy of the current displayed cards.
    setCurrentDisplayedCards(cards.slice());

    const tbody = document.getElementById("cardBody");
    if (!tbody) {
        return;
    }
    tbody.innerHTML = "";

    logMessage(`isAndroidApp: ${isAndroidApp()}`);

    const formatSelect = document.getElementById("formatSelect");
    const selectedFormat = formatSelect ? formatSelect.value : "Default";

    let myFormatMap = {};

    if (currentGame === "Yu-Gi-Oh") {

        if (selectedFormat === "Edison") {
            myFormatMap = await loadFormat("edison-legal.json");
        }

        if (selectedFormat === "GOAT") {
            myFormatMap = await loadFormat("goat-legal.json");
        }

        if (selectedFormat === "GOAT2EDISON") {
            const edisonMap = await loadFormat("edison-legal.json");
            const goatMap = await loadFormat("goat-legal.json");

            myFormatMap = Object.fromEntries(
                Object.entries(edisonMap).filter(([name]) => !goatMap[name])
            );
        }

        if (selectedFormat === "Modern") {
            const edisonMap = await loadFormat("edison-legal.json");
            myFormatMap = {};

            for (const card of cards) {
                if (!edisonMap[card.name]) {
                    myFormatMap[card.name] = true;
                }
            }
        }
    }

    // -------------------------
    // FILTRI
    // -------------------------
    let filtered_cards = cards.filter(card =>
        isCardGoodForFormat(card, currentGame, selectedFormat, myFormatMap)
    );

    // Deduplicazione
    const duplicateCheck = document.getElementById("duplicatesCheckbox");
    if (!duplicateCheck || !duplicateCheck.checked) {
        const seen = new Set();
        filtered_cards = filtered_cards.filter(card => {
            if (seen.has(card.name)) return false;
            seen.add(card.name);
            return true;
        });
    }

    // Aggiorna subito il conteggio
    const resultCountEl = document.getElementById("resultCount");

    if (filtered_cards.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 15;
        td.textContent = translations[langIndex]["nothingfound"];
        tr.appendChild(td);
        tbody.appendChild(tr);

        if (resultCountEl) {
            resultCountEl.textContent =
                translations[langIndex]["showingentries"].replace("NUMBER", "0");
        }
        return;
    }

    const uniqueNames = new Set(filtered_cards.map(c => c.name));
	
	// -------------------------
    // IntersectionObserver per immagini
    // -------------------------
    const imageObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            const img = e.target;
            const card = img._card;

            getImageSrcForCard(card).then(src => {
                if (src && src.length > 0) img.src = src;
                else img.classList.add("image-missing");
            });

            imageObserver.unobserve(img);
        });
    });
	
	// -------------------------
    // COSTRUZIONE TABELLA (DocumentFragment)
    // -------------------------
    const fragment = document.createDocumentFragment();

    const nowrap_td = !allowNewlines;
    const usetall_tr = useTallTr;
    const usesmall_tr = useSmallTr;

    const sortBy = document.getElementById("sortBy").value;
	
    filtered_cards.forEach((card) => {

        const tr = document.createElement("tr");

        if (usetall_tr) tr.classList.add("tall-tr");
        if (usesmall_tr) tr.classList.add("small-tr");
        if (nowrap_td) tr.classList.add("nowrap-td");
		
		const imgTd = document.createElement("td");

        // Image cell with a set maximum width and error-handling tooltip.
		if (usetall_tr) imgTd.classList.add("tall-tr");
        if (usesmall_tr) imgTd.classList.add("small-tr");
        if (nowrap_td) imgTd.classList.add("nowrap-td");

        let showImage = document.getElementById("imageth");

        if (shouldShowImage) {

            // showImage.style.display = "block";

            imgTd.classList.add("img-cell");
            const img = document.createElement("img");
			img.alt = "X";
			img.loading = "lazy";

			// Placeholder leggerissimo (SVG 1x1)
			img.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlZWUiLz48L3N2Zz4=";

			// Caricamento reale solo quando l'immagine entra in viewport
			img._card = card;

			imageObserver.observe(img);

			logMessage(`Trying to load image: ${img.src}`);

            function mouseEnterHandler(e) {
                showOverlay(e, card, img);
            }

            function mouseMoveHandler(e) {
                updateOverlayPosition(e, img, document.getElementById('fullImageOverlay'));
            }

            function mouseLeaveHandler() {
                hideOverlay();
            }

            img.onerror = function() {

                // helper scoped inside onerror: remove accents, unsupported chars, collapse spaces/underscores
                function sanitizeFileName(str) {
                    return str
                        .normalize('NFD') // decompose accented chars
                        .replace(/[\u0300-\u036f]/g, '') // strip diacritics
                        .replace(/[:#"\/\\?%*|<>]/g, '') // remove unsupported symbols
                        .trim() // trim edges
                        .replace(/\s+/g, '_') // collapse spaces to underscores
                        .replace(/_+/g, '_') // collapse multiple underscores
                }

                // build each segment using sanitizeFileName
                const gameDir = sanitizeFileName(currentGame.replaceAll("-", ""))
                    .toLowerCase();
                const langDir = sanitizeFileName(card.language)
                    .toUpperCase();
                const idFile = sanitizeFileName(card.id);

                // set tooltip to the exact path you're attempting to load
                logMessage(`❌ Failed to load image: ${img.src}`);
                this.title = `Failed to load: ${img.src}`;

                // revert styling
                img.classList.remove("card-image");

                // detach event listeners
                img.removeEventListener("click", clickHandler);
                img.removeEventListener("mouseenter", mouseEnterHandler);
                img.removeEventListener("mousemove", mouseMoveHandler);
                img.removeEventListener("mouseleave", mouseLeaveHandler);
            };



            if (img.src.length > 0) {
                //console.log(img.src);
                img.classList.add("card-image");

                // Add the event listeners
                if (localMode) {
                    img.addEventListener('click', () => clickHandler(card, !duplicateCheck.checked));
                }
                img.addEventListener("mouseenter", mouseEnterHandler);
                img.addEventListener("mousemove", mouseMoveHandler);
                img.addEventListener("mouseleave", mouseLeaveHandler);
            }

            imgTd.appendChild(img);
            tr.appendChild(imgTd);
        } else {
            showImage.style.display = "none";
            showImage.style.width = "0px";
            showImage.style.height = "0px";
        }

        // Name.
        let tdName = document.createElement("td");
        tdName.textContent = card.name.replaceAll("\\", "");
        if (card.rarity.toLowerCase() == (translations[0]["fake"] || "FAKE")
            .toLowerCase()) {
            tdName.innerHTML = tdName.textContent + " <b>(" + translations[langIndex]["fake"] + ")</b>";
        }
        tr.appendChild(tdName);

        // Type.
        let tdType = document.createElement("td");
        tdType.innerHTML = getTypeDisplay(card.type);
        tr.appendChild(tdType);

        // Rarity.
        let tdRarity = document.createElement("td");
        let fakestr = `<span class="badge badge-card-fake">` + (translations[langIndex]["fake"] || "FAKE") + `</span>`;
        let rarity_str = "Unknown";
        if (card.rarity) {
            rarity_str = (card.rarity.toLowerCase() == ((translations[0]["fake"] || "FAKE")
                .toLowerCase()) ? fakestr : translations[langIndex][card.rarity.toLowerCase()
                .trim()
                .replaceAll(" ", "")
            ]);

            if (rarity_str && rarity_str.length > 0) {
                rarity_str = rarity_str.replaceAll("——", "—").replaceAll("— ", "");
            } else {
                //console.log(card.name + ": weird rarity");
            }
        }
        tdRarity.innerHTML = getRarityBadge(card.rarity, rarity_str);


        //if (card.name.includes("Esosorelle")) console.log(tdRarity.innerHTML + " because " + card.rarity.toLowerCase().trim().replaceAll(" ", "") + " is " + translations[langIndex][card.rarity.toLowerCase().trim().replaceAll(" ", "")]);

        tr.appendChild(tdRarity);

        // Quality badge.
        let tdQuality = document.createElement("td");
        tdQuality.innerHTML = getQualityBadge(sellerMode && card.quality === "Unknown (good)" ? "Moderately Played" : card.quality)
            .replaceAll("None", "");
        tr.appendChild(tdQuality);

        // Language badge.
        let tdLanguage = document.createElement("td");
        tdLanguage.innerHTML = getLanguageBadge(card.language)
            .replaceAll("None", "")
            .replaceAll("NONE", "");
        tr.appendChild(tdLanguage);

        // Edition badge.
        let tdEdition = document.createElement("td");
        tdEdition.innerHTML = getEditionBadge(card.edition.replaceAll("None", ""));
        tr.appendChild(tdEdition);

        let have_min_price = false;
        let min_price = 3;

        if (have_min_price && card.pricePaid.toFixed(2) < min_price) {
            return;
        }

        // Price I Paid.
        let tdPricePaid = document.createElement("td");
        tdPricePaid.textContent = card.pricePaid.toFixed(2);
        if (sellerMode) {
            tdPricePaid.style.height = "0px";
            tdPricePaid.style.width = "0px";
            tdPricePaid.style.display = "none";
            tdPricePaid.style.opacity = "0%";
        }
        tr.appendChild(tdPricePaid);

        // Market Price.

        let cleanedMarketPrice = (card.marketPrice || "").toString().replaceAll("⬆️", "")
            .replaceAll("⬇️", "")
            .replaceAll("➡️", "")
            .replaceAll("None", "");
        let tdMarketPrice = document.createElement("td");
        if (sellerMode) {
            tdMarketPrice.textContent = Math.max(Math.ceil(card.pricePaid * 3.85 * 10) / 10, 1).toFixed(2).toString();
        } else {
            tdMarketPrice.textContent = card.marketPrice;
        }
        tr.appendChild(tdMarketPrice);

        // ID.
        let tdID = document.createElement("td");
        tdID.textContent = card.id.replaceAll("None", "")
            .replaceAll("NONE", "");
        tr.appendChild(tdID);

        // Pack ID
        let tdPackID = document.createElement("td");
        tdPackID.textContent = card.packId.replaceAll("None", "")
            .replaceAll("NONE", "") + " ";
        tdPackID.style.height = "0px";
        tdPackID.style.width = "0px";
        tdPackID.style.display = "none";
        tdPackID.style.opacity = "0%";
        tr.appendChild(tdPackID);

        const skip_before_2020 = false;
        const skip_before_specific_date = false; // NEW optional flag
        //const cutoffDate = new Date(2025, 10, 4); // JS months are 0‑indexed → 10 = November
        const cutoffDate = new Date(2026, 7, 1); // JS months are 0‑indexed → 10 = November

        // Date Obtained.
        if (card.dateObtained) {

            // Expecting dd/mm/YYYY
            const parts = card.dateObtained.split("/");
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // JS months are 0‑indexed
                const year = parseInt(parts[2], 10);

                const obtainedDate = new Date(year, month, day);

                // Skip this card if year < 2020
                if (skip_before_2020 && year < 2020) {
                    return;
                }

                // NEW: Skip this card if obtained before 04/11/2025
                if (skip_before_specific_date && obtainedDate < cutoffDate) {
                    return;
                }
            }
        }

        let tdDate = document.createElement("td");
        tdDate.textContent = card.dateObtained;
        if (sellerMode) {
            tdDate.style.height = "0px";
            tdDate.style.width = "0px";
            tdDate.style.display = "none";
            tdDate.style.opacity = "0%";
        }
        tr.appendChild(tdDate);

        let myspecifiedloc = "IP:M Album";
        if (false && card.location.toLowerCase() != myspecifiedloc.toLowerCase()) {
            return;
        }

        // Location.
        let tdLocation = document.createElement("td");
        tdLocation.textContent = card.location;
        if (sellerMode) {
            tdLocation.style.height = "0px";
            tdLocation.style.width = "0px";
            tdLocation.style.display = "none";
            tdLocation.style.opacity = "0%";
        }
        tr.appendChild(tdLocation);

        // …inside your row‐rendering loop…

        let tdComments = document.createElement("td");
        let comments = card.comments || "";

        // Clear tdComments in case it had text
        tdComments.textContent = "";

        if (enableCollections) {
            comments = comments.replaceAll("{", "[").replaceAll("}", "]");
            // Regex to match [Something] patterns
            const parts = comments.split(/(\[[^\]]+\])/g);

            parts.forEach(part => {
                if (part.startsWith("[") && part.endsWith("]")) {
                    const label = part.slice(1, -1); // remove brackets
                    const btn = createStealthButton(label);
                    tdComments.appendChild(btn);
                    tdComments.appendChild(document.createTextNode(" "));
                } else {
                    tdComments.appendChild(document.createTextNode(part));
                }
            });
        } else {
            tdComments.textContent = comments.replaceAll("{", "").replaceAll("}", "").replaceAll(/\[[^\]]+\]/g, "").trim();
        }

        if (sortBy === "stonks") {
            const profit = (cleanedMarketPrice - Number(card.pricePaid))
                .toFixed(2);

            if (Number(profit) > 0.00 && Number(card.pricePaid) > 0.00) {
                // inject <br> only if there are comments
                tdComments.textContent = ("+" + profit);
            } else {
                tdComments.textContent = "";
            }
        }

        tr.appendChild(tdComments);

        // Wiki button.
        let tdWiki = document.createElement("td");
        if (card.wikiUrl && card.wikiUrl.length > 0) {
            let wikiBtn = document.createElement("button");
            wikiBtn.textContent = translations[langIndex]["go"];
            wikiBtn.addEventListener("click", () => {
                window.open(card.wikiUrl, "_blank");
            });
            tdWiki.appendChild(wikiBtn);
        } else {
            tdWiki.textContent = "";
        }

        if (sellerMode) {
            tdWiki.style.height = "0px";
            tdWiki.style.width = "0px";
            tdWiki.style.display = "none";
            tdWiki.style.opacity = "0%";
        }

        tr.appendChild(tdWiki);

        fragment.appendChild(tr);
    });
	
	tbody.appendChild(fragment);

    setCurrentDisplayedCards(filtered_cards.slice());

    updateTotalSpent();

    if (resultCountEl) {
        resultCountEl.innerHTML = "<div class=\"results\">" + translations[langIndex]["showingcards"]
            .replace("NUMBER", filtered_cards.length.toString())
            .replace("UNIQUENUM", uniqueNames.size.toString()) + "\t</div>";
    }
}

if (enableCollections) {
    // Detect CTRL+F / CMD+F and hide labels temporarily
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
            console.log("Hiding");
            document.querySelectorAll(".tag-button").forEach(btn => {
                btn.classList.add("hidden-label");
            });

            // Optional: restore after 5 seconds
            setTimeout(() => {
                document.querySelectorAll(".tag-button").forEach(btn => {
                    btn.classList.remove("hidden-label");
                });
            }, 9999);
        }
    });
}