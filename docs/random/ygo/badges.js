import {
    langIndex,
} from './config.js';

import {
    has_debug_checkbox,
} from './dynamic.js';

import {
    currentGame,
} from './detect.js';

import {
    translations,
} from './translations.js';

import {
    getYgoBadgeRules,
} from './yugioh.js';

import {
    getPkmBadgeRules,
} from './pokemon.js';

import {
    getVanguardBadgeRules,
} from './vanguard.js';

import {
    getDigimonBadgeRules,
} from './digimon.js';

import {
    getMTGBadgeRules,
} from './mtg.js';

import {
    getOnePieceBadgeRules,
} from './onepiece.js';

import {
    getDBSBadgeRules,
} from './dbs.js';

import {
    clean,
} from './utils.js';

// Language dictionary mapping two-letter codes to emoji.
var languageDict = {
    "IT": "🇮🇹",
    "EN": "🇺🇸",
    "DE": "🇩🇪",
    "FR": "🇫🇷",
    "JP": "🇯🇵",
	"KR": "🇰🇷"
};

// Define shared badge rules (could be moved to a separate module too!)
export const sharedBadgeRules = [
    { key: 'sleeves', cssClass: 'badge-type-sleeves' },
    { key: 'structuredeck', cssClass: 'badge-type-structuredeck' },
    { key: 'starterdeck', cssClass: 'badge-type-starterdeck' },
    { key: 'storage', cssClass: 'badge-type-storage' },
    { key: 'fieldcentercard', cssClass: 'badge-type-fieldcentercard' },
    { key: 'empty', cssClass: 'badge-type-empty' },
    { key: 'album', cssClass: 'badge-type-album' },
    { key: 'separator', cssClass: 'badge-type-separator' },
    { key: 'deckcase', cssClass: 'badge-type-deckcase' },
    { key: 'playmat', cssClass: 'badge-type-playmat' },
];

export function getLanguageBadge(language) {
    let code = language.trim()
        .toUpperCase();
    let emoji = languageDict[code] || code;
    return `<span data-cell-title="Language">${emoji}</span>`;
}

export function getQualityBadge(quality) {
    let q = quality.toLowerCase();

    if (q === translations[0]["unknowngood"].toLowerCase()) {
        return '<span class="badge" data-original-title="UnknownGood" title="UnknownGood">✅</span>';
    }
    if (q === translations[0]["unknownbad"].toLowerCase()) {
        return '<span class="badge" data-original-title="UnknownBad" title="UnknownBad">❌</span>';
    }

    if (q === "none") {
        return "";
    }

    if (q === translations[0]["mint"].toLowerCase()) {
        return '<span class="badge badge-cond-mint" data-original-title="Mint" title="Mint">MT</span>';
    } else if (q === translations[0]["nearmint"].toLowerCase()) {
        return '<span class="badge badge-cond-near-mint" data-original-title="Near Mint" title="Near Mint">NM</span>';
    } else if (q === translations[0]["slightlyplayed"].toLowerCase()) {
        return '<span class="badge badge-cond-slightly-played" data-original-title="Slightly Played" title="Slightly Played">SP</span>';
    } else if (q === translations[0]["moderatelyplayed"].toLowerCase()) {
        return '<span class="badge badge-cond-moderately-played" data-original-title="Moderately Played" title="Moderately Played">MP</span>';
    } else if (q === translations[0]["played"].toLowerCase()) {
        return '<span class="badge badge-cond-played" data-original-title="Played" title="Played">PL</span>';
    } else if (q === translations[0]["poor"].toLowerCase()) {
        return '<span class="badge badge-cond-poor" data-original-title="Poor" title="Poor">PO</span>';
    } else {
        return quality;
    }
}

export function getRarityBadge(rarity, tl) {
    let r = rarity.replaceAll(" ", "").toLowerCase();

    if (!tl) {
        if (!rarity) {
            return "r-undefined";
        }
        return rarity == "None" ? "" : rarity;
    }

    let is_fake = rarity.toLowerCase() == ((translations[0]["fake"] || "FAKE").toLowerCase());
    if (is_fake) {
        return '<span class="badge badge-card-fake">' + translations[langIndex]["fake"] + '</span>';
    }

    let badge = "defaultbadge";
    let ot = "defaultot";
    let value = tl;

    if (r === "common") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-common";
        ot = "Common";
    } else if (r === "rare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-rare";
        ot = "Rare";
    } else if (r === "parallelrare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-parallelrare";
        ot = "Parallel Rare";
    } else if (r === "goldrare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-goldrare";
        ot = "Gold Rare";
    } else if (r === "superrare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-superrare";
        ot = "Super Rare";
    } else if (r === "ultrarare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-ultrarare";
        ot = "Ultra Rare";
    } else if (r === "ultraparallelrare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-ultraparallelrare";
        ot = "Ultra Parallel Rare";
    } else if (r === "parallelultrarare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-parallelultrarare";
        ot = "Parallel Ultra Rare";
    } else if (r === "platinumsecretrare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-platinumsecretrare";
        ot = "Platinum Secret Rare";
    } else if (r === "prismaticsecretrare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-prismaticsecretrare";
        ot = "Prismatic Secret Rare";
    } else if (r === "goldsecretrare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-goldsecretrare";
        ot = "Gold Secret Rare";
    } else if (r === "premiumgoldrare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-premiumgoldrare";
        ot = "Premium Gold Rare";
    } else if (r === "secretrare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-secretrare";
        ot = "Secret Rare";
    } else if (r === "quartercenturysecretrare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-quartercenturysecretrare";
        ot = "Quarter Century Secret Rare";
    } else if (r === "ghostrare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-ghostrare";
        ot = "Ghost Rare";
    } else if (r === "collectorsrare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-collectorsrare";
        ot = "Collector's Rare";
    } else if (r === "prismaticcollectorsrare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-prismaticcollectorsrare";
        ot = "Prismatic Collector's Rare";
    } else if (r === "ultimaterare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-ultimaterare";
        ot = "Ultimate Rare";
    } else if (r === "prismaticultimaterare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-prismaticultimaterare";
        ot = "Prismatic Ultimate Rare";
    } else if (r === "starlightrare") {
        badge = "badge " + currentGame.toLowerCase() + "-badge-rarity-starlightrare";
        ot = "Starlight Rare";
    } else {
        return rarity;
    }

    return '<span class="' + badge + '" data-original-title="' + ot + '" title="' + ot + '">' + value + '</span>';
}


export function getEditionBadge(edition) {
    let accepted = true;
    let ed = edition.toLowerCase();
    let num = "";
    if (ed.includes(translations[0]["first"].toLowerCase())) {
        num = "1";
        accepted = true;
    } else if (ed.includes(translations[0]["limited"].toLowerCase())) {
        num = "0";
        accepted = true;
    } else if (ed.includes(translations[0]["standard"].toLowerCase())) {
        num = "2";
        accepted = !has_debug_checkbox;
    } else {
        num = "3";
        accepted = !has_debug_checkbox;
    }
    // Here, we return two classes: a base class ("edition-badge") for common styling,
    // and a dynamic class ("edition-badge-[num]") for specific modifications.
    return (accepted ? `<span class="edition-badge edition-badge-${num}" data-original-title="${edition}">${num}</span>` : `<span class="null" data-original-title="${edition}"></span>`);
}

// make any string into a predictable slug (preserve dashes)
function slugify(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/['’]/g, "") // strip quotes/apostrophes
        .replace(/[^a-z0-9]+/g, "-") // any run of non-alnum → single dash
        .replace(/^-+|-+$/g, ""); // trim leading/trailing dashes
}

export function getTypeDisplay(typeText) {
    const badges = [];
    let base = typeText;

    // extract (...) token list
    const regex = /\(([^)]+)\)/;
    const match = typeText.match(regex);
    if (match) {
        base = base.replace(regex, "")
            .trim();
        const tokens = match[1].split("/")
            .map(t => t.trim());

        // pick rules for this game
        let rules = [...sharedBadgeRules];
        switch (currentGame) {
            case "Yu-Gi-Oh":
                rules.push(...getYgoBadgeRules());
                break;
            case "Pokémon":
                rules.push(...getPkmBadgeRules());
                break;
            case "Vanguard":
                rules.push(...getVanguardBadgeRules());
                break;
            case "Digimon":
                rules.push(...getDigimonBadgeRules());
                break;
            case "Magic: The Gathering":
                rules.push(...getMTGBadgeRules());
                break;
            case "One Piece":
                rules.push(...getOnePieceBadgeRules());
                break;
            case "Dragon Ball Super":
                rules.push(...getDBSBadgeRules());
                break;
        }

        tokens.forEach(token => {
            const slug = slugify(token); // e.g. "Quick-Play Spell" → "quick-play-spell"
            const noslug = slug.replace(/-/g, ""); // or → "quickplayspell"

            // try both variants
            let rule = rules.find(r => r.key === slug);
            if (!rule) rule = rules.find(r => r.key === noslug);

            if (!rule) {
                console.warn(`No badge rule for token "${token}" → tried [${slug}, ${noslug}]`);
                return;
            }

            // lookup translation or fallback to raw token
            const raw = translations[langIndex][rule.key] || token;
            badges.push(`<span class="${rule.cssClass}">${clean(raw)}</span>`);
        });
    }

    // render the base (type) text
    const baseKey = slugify(base);
    const baseDisplay = ((translations[langIndex][baseKey]) || base)
        .replaceAll("——", "—")
        .replaceAll("— ", "");

    //console.log("Attempting BADGE for " + baseKey + " (aka " + base + ") -- result: " + baseDisplay);

    return badges.length ?
        `${baseDisplay} ${badges.join(" ")}` :
        baseDisplay;
}