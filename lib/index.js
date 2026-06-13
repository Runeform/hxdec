"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hxdec = {
    setData: [], // to be populated with set data from scryfall on init
    encode: (list, foil = false, tags = false, cat = false) => {
        if (hxdec.setData.length === 0) {
            hxdec.error("Set data not ready yet, cannot encode");
            return;
        }
        const digestList = () => {
            if (list.length === 0) {
                hxdec.error("No deck list provided");
                return [];
            }
            const sections = list.split("\n\n");
            const listData = {
                name: "",
                targetSection: "",
                commander: [],
                mainboard: [],
                sideboard: [],
                maybeboard: [],
                companion: [],
                prefetch: [], // cards that need to be fetched from scryfall to get set and collector number info for encoding
            };
            let targetSection = "mainboard"; // default section target
            sections.forEach((section) => {
                const sec = section.split("\n");
                sec.forEach((line, index) => {
                    line = line.trim();
                    // if  line doesnt start with a number followed by " " or "x ", It is not a card line.  Check to see if its a section title and then, assign  the targetSection based on the title.  If the title is "About" and it is the first line of the first section, check to see if the second line starts with "Name " and if so, capture the deck name from that line and assign it to listData.name.  If the line is not a card line or a section header, skip it.
                    if (!/^\d+x?\s/.test(line)) {
                        const titleLine = line.toLowerCase().replace(":", "");
                        console.log(`Processing section title: ${titleLine}`);
                        if (titleLine === "commander" || titleLine === "companion" || titleLine === "sideboard" || titleLine === "maybeboard" || titleLine === "mainboard") {
                            targetSection = titleLine;
                        }
                        if (titleLine === "deck") {
                            targetSection = "mainboard";
                        }
                        if (titleLine === "about" && index === 0 && /^Name\s/.test(sec[1])) {
                            listData.name = sec[1].split("Name")[1].trim();
                        }
                        return;
                    }
                    else if (sec.length < 3 && index === 0 && listData.commander.length === 0) {
                        // 1-2 separate lines with no section headerde notes commanders for some formats
                        targetSection = "commander";
                    }
                    const newCard = hxdec.digestCard(line);
                    if (typeof newCard.hxnumber === "undefined" || typeof newCard.hxcode === "undefined") {
                        listData.prefetch = listData.prefetch || [];
                        listData.prefetch.push(Object.assign(Object.assign({}, newCard), { targetSection }));
                        return;
                    }
                    else if (typeof newCard.cat !== "undefined" && newCard.cat.includes("Commander")) {
                        listData.commander = listData.commander || [];
                        listData.commander.push(Object.assign(Object.assign({}, newCard), { targetSection }));
                    }
                    else {
                        listData[targetSection] = listData[targetSection] || [];
                        listData[targetSection].push(Object.assign(Object.assign({}, newCard), { targetSection }));
                    }
                });
            });
            if (typeof listData.prefetch !== "undefined") {
                hxdec.getCardData(listData.prefetch, ["set", "collector_number"], (cards) => {
                    cards.forEach((card) => {
                        var _a;
                        // add each card to its target section and update the hxcode and hxnumber based on the set and collector number
                        if (typeof card.set !== "undefined" && typeof card.collector_number !== "undefined" && typeof hxdec.setData !== "undefined") {
                            card.hxcode = ((_a = hxdec.setData.find(s => s.code.toLowerCase() === card.set.toLowerCase())) === null || _a === void 0 ? void 0 : _a.hxcode) || null;
                            if (card.hxcode) {
                                const collectorNumber = card.collector_number;
                                if (/^\d+$/.test(collectorNumber)) {
                                    card.hxnumber = Number(collectorNumber).toString(16);
                                }
                                else {
                                    card.hxnumber = `~${collectorNumber}~`;
                                }
                            }
                            else {
                                hxdec.warning(`No set data found for set: ${card.set} on card: ${card.name}`);
                            }
                            listData[card.targetSection] = listData[card.targetSection] || [];
                            listData[card.targetSection].push(card);
                        }
                    });
                    console.log("Decoded list data and fetched missing card info from scryfall:", listData);
                    buildHxdec(listData);
                });
            }
            else {
                console.log("Decoded list data:", listData);
                buildHxdec(listData);
            }
            return;
        };
        const buildHxdec = (listData) => {
            // build the hxdec string based on the listData and setData
            const outputCards = (rawCards) => {
                let newCards = "";
                rawCards.forEach(card => {
                    const qtyChars = ["u", "v", "w", "x", "y", "z"];
                    let cardString = "";
                    if (card.qty >= 1 && card.qty <= 4) {
                        cardString += qtyChars[card.qty - 1];
                    }
                    else if (card.qty > 4 && card.qty < 16) {
                        const qtyHex = Number(card.qty).toString(16);
                        cardString += `y${qtyHex}`;
                    }
                    else if (card.qty >= 16 && card.qty < 256) {
                        const qtyHex = Number(card.qty).toString(16);
                        cardString += `z${qtyHex}`;
                    }
                    else {
                        cardString += "zff";
                    }
                    cardString += card.hxcode;
                    cardString += card.hxnumber;
                    if (foil && typeof card.foil !== "undefined") {
                        cardString += `*${card.foil}*`;
                    }
                    if (tags && typeof card.tags !== "undefined") {
                        cardString += `^${card.tags}^`;
                    }
                    if (cat && typeof card.cat !== "undefined") {
                        cardString += `[${card.cat}]`;
                    }
                    newCards += cardString;
                });
                return newCards;
            };
            if (typeof listData.mainboard === "undefined" || listData.mainboard.length === 0) {
                hxdec.error("No mainboard cards found, cannot build HXDEC");
                return;
            }
            // If this is a type of format that lists a commander as the first card in the mainboard section without a section header, move it to the commander section and remove it from the mainboard section
            if (typeof listData.mainboard !== "undefined" && typeof listData.commander === "undefined") {
                // count the number of cards in the mainboard
                let mainboardCount = 0;
                listData.mainboard.forEach((mainboardCard) => {
                    mainboardCount += mainboardCard.qty;
                });
                if (mainboardCount > 98) {
                    // Mainboard has more than 98 cards and no commander specified, treating first card as commander
                    listData.commander = [listData.mainboard[0]];
                    listData.mainboard = listData.mainboard.slice(1);
                }
            }
            let deck = `h${outputCards(listData.mainboard)}`;
            if (typeof listData.commander !== "undefined") {
                deck += `k${outputCards(listData.commander)}`;
            }
            if (typeof listData.sideboard !== "undefined") {
                deck += `s${outputCards(listData.sideboard)}`;
            }
            if (typeof listData.maybeboard !== "undefined") {
                deck += `m${outputCards(listData.maybeboard)}`;
            }
            if (typeof listData.companion !== "undefined") {
                deck += `p${outputCards(listData.companion)}`;
            }
            if (typeof listData.name !== "undefined") {
                deck += `+${encodeURIComponent(listData.name)}+`;
            }
            hxdec.ready();
            hxdec.encoded(deck);
            return;
        };
        hxdec.loading("Processing deck list");
        digestList();
    },
    decode: (list, format = "Archideckt") => {
        if (hxdec.setData.length === 0) {
            console.log("Set data not ready yet, cannot decode");
            return;
        }
        hxdec.loading("Decoding HXDEC string");
        // Decoding logic to be implemented
        // remove values wrapped and store them in an array, replace them in the deck string with their index in the array wrapped in thier original wrap symbol so they can be reinserted after splitting the string into sections
        const captureWrappedValues = (wrap1, wrap2, regex) => {
            const capturedValues = [];
            const matches = list.match(regex) || [];
            // for each match push the value without the wrapSymbol to capturedValues and replace the match in list with a placeholder of the index wrapped
            matches.forEach((match, index) => {
                // console.log(`Captured value for ${wrap1}${wrap2}:`, match);
                capturedValues.push(match.replace(wrap1, "").replace(wrap2, ""));
                list = list.replace(match, `${wrap1}${index}${wrap2}`);
            });
            return capturedValues;
        };
        const categoryValues = captureWrappedValues("[", "]", /\[(.*?)\]/g);
        const textSets = captureWrappedValues("~", "~", /~(.*?)~/g);
        const foilValues = captureWrappedValues("*", "*", /\*(.*?)\*/g);
        const tagValues = captureWrappedValues("^", "^", /\^(.*?)\^/g);
        const nameValue = captureWrappedValues("+", "", /\+(.*)\+/g);
        const decodedData = { name: "", prefetch: [] };
        if (nameValue.length > 0) {
            decodedData.name = decodeURIComponent(nameValue[0]);
        }
        list = list.replace(/\+(.*)\+/g, ""); // remove the name from the list string so it doesn't interfere with section splitting
        const sections = list.split(/(?=[hksmp])/);
        sections.forEach(section => {
            const type = section[0];
            const data = section.substring(1);
            const cardCodes = data.split(/(?=[uvwxyz])/);
            const targetSection = type === "h" ? "mainboard" : type === "k" ? "commander" : type === "s" ? "sideboard" : type === "m" ? "maybeboard" : type === "p" ? "companion" : null;
            if (targetSection) {
                const cards = [];
                cardCodes.forEach(code => {
                    //  get the first character and remove it
                    const qtyChar = code[0];
                    code = code.substring(1);
                    let qty = ["u", "v", "w", "x", "y", "z"].indexOf(qtyChar) + 1;
                    if (qtyChar === "y") {
                        qty = parseInt(code.substring(0, 1), 16);
                        code = code.substring(1);
                    }
                    if (qtyChar === "z") {
                        qty = parseInt(code.substring(0, 2), 16);
                        code = code.substring(2);
                    }
                    const setHx = code.substring(0, 3);
                    // if code contains * , extract the foil value and remove it from the code
                    let foil = null;
                    if (code.includes("*")) {
                        const foilMatch = code.match(/\*(.*?)\*/);
                        if (foilMatch) {
                            foil = foilValues[parseInt(foilMatch[1])];
                            code = code.replace(foilMatch[0], "");
                        }
                    }
                    // if code contains ^, extract the tag value and remove it from the code
                    let tags = null;
                    if (code.includes("^")) {
                        const tagMatch = code.match(/\^(.*?)\^/);
                        if (tagMatch) {
                            tags = tagValues[parseInt(tagMatch[1])];
                            code = code.replace(tagMatch[0], "");
                        }
                    }
                    // if code contains [ ], extract the category value and remove it from the code
                    let category = null;
                    if (code.includes("[")) {
                        const categoryMatch = code.match(/\[(.*?)\]/);
                        if (categoryMatch) {
                            category = categoryValues[parseInt(categoryMatch[1])];
                            code = code.replace(categoryMatch[0], "");
                        }
                    }
                    const numberHx = code.substring(3);
                    let number = Number(parseInt(numberHx, 16)).toString();
                    if (isNaN(parseInt(number)) && numberHx.includes("~")) {
                        number = textSets[parseInt(numberHx.replace("~", ""))];
                    }
                    else if (isNaN(parseInt(number))) {
                        console.log(`Invalid collector number hex: ${numberHx} for code: ${code}`);
                    }
                    let set = null;
                    // find set in set data
                    const setInfo = hxdec.setData.find(s => s.hxcode === setHx);
                    if (setInfo) {
                        set = setInfo.code;
                    }
                    const newCard = { code, qty, set, number, foil, tags, category, targetSection };
                    cards.push(newCard);
                });
                decodedData.prefetch.push(...cards);
                return;
            }
            console.log(`Unknown section type: ${type} in section: ${section}`);
            return;
        });
        hxdec.getCardData(decodedData.prefetch, ["name"], (cards) => {
            cards.forEach(card => {
                decodedData[card.targetSection] = decodedData[card.targetSection] || [];
                decodedData[card.targetSection].push(card);
            });
            buildList(decodedData);
            console.log("Decoded data with card names:", decodedData);
        });
        const buildList = (decodedData) => {
            let formatOptions = {
                mainboardTitle: "",
                commanderTitle: "",
                sideboardTitle: "",
                maybeboardTitle: "",
                companionTitle: "",
                nameTitle: "",
                name: false,
                sets: false,
                collectorNumber: false,
                foil: false,
                cat: false,
                tags: false,
                order: ["commander", "mainboard", "companion", "sideboard", "maybeboard"]
            };
            if (format === "Archideckt") {
                formatOptions = Object.assign(Object.assign({}, formatOptions), { mainboardTitle: "\nMainboard\n", commanderTitle: "\nCommander\n", sideboardTitle: "\nSideboard\n", maybeboardTitle: "\nMaybeboard\n", companionTitle: "\nCompanion\n", sets: true, collectorNumber: true, foil: true, cat: true, tags: true });
            }
            if (format === "MTGO") {
                formatOptions = Object.assign(Object.assign({}, formatOptions), { sideboardTitle: "\nSIDEBOARD:\n", commanderTitle: "\n", order: ["mainboard", "companion", "sideboard", "commander", "maybeboard"] });
            }
            if (format === "Arena") {
                formatOptions = Object.assign(Object.assign({}, formatOptions), { mainboardTitle: "\nDeck\n", commanderTitle: "\nCommander\n", sideboardTitle: "\nSideboard\n", nameTitle: "About\nName ", name: true });
            }
            if (format === "Moxfield") {
                formatOptions = Object.assign(Object.assign({}, formatOptions), { sideboardTitle: "\nSIDEBOARD:\n", sets: true, collectorNumber: true, foil: true });
            }
            let newList = "";
            if (formatOptions.name && decodedData.name) {
                newList += `${formatOptions.nameTitle}${decodedData.name}\n`;
            }
            const buildCardLine = (card) => {
                let line = `${card.qty} ${card.name}`;
                if (formatOptions.sets && card.set) {
                    line += ` (${card.set})`;
                }
                if (formatOptions.collectorNumber && card.number) {
                    line += ` ${card.number}`;
                }
                if (formatOptions.foil && card.foil) {
                    line += ` *${card.foil}*`;
                }
                if (formatOptions.cat && card.category) {
                    line += ` [${card.category}]`;
                }
                if (formatOptions.tags && card.tags) {
                    line += ` ^${card.tags}^`;
                }
                return line;
            };
            const renderSection = (section, title) => {
                if (section && section.length > 0) {
                    newList += title;
                    section.forEach(card => {
                        newList += buildCardLine(card) + "\n";
                    });
                }
            };
            formatOptions.order.forEach((sectionKey) => {
                if (decodedData[sectionKey]) {
                    const title = formatOptions[`${sectionKey}Title`] || "";
                    renderSection(decodedData[sectionKey], title);
                }
            });
            // trim the final newList and set it to the output
            newList = newList.trim();
            hxdec.ready();
            hxdec.decoded(newList);
        };
        return;
    },
    init: () => {
        // fetch all sets from scryfall and prepare them for initial firebase upload
        if (typeof hxdec.setData !== "undefined") {
            console.log("Set data already processed, skipping fetch");
            return;
        }
        hxdec.loading("Fetching set data from scryfall");
        fetch("https://api.scryfall.com/sets")
            .then((resp) => resp.json())
            .then((resp) => {
            if (typeof resp.data !== "undefined" && resp.data.length > 0) {
                const sets = [];
                const initSetsData = resp.data;
                // sort initSetsData by release date ascending
                initSetsData.sort((a, b) => {
                    const dateA = new Date(a.released_at).getTime();
                    const dateB = new Date(b.released_at).getTime();
                    return dateA - dateB;
                });
                let setCounter = 1;
                initSetsData.forEach((set) => {
                    if (set.set_type !== "token") {
                        const hxcode = Number(setCounter).toString(16).padStart(3, "0");
                        const newSet = {
                            date: new Date(set.released_at).getTime(),
                            code: set.code,
                            hxcode
                        };
                        sets.push(newSet);
                        setCounter++;
                    }
                });
                if (sets.length > 0) {
                    hxdec.setData = sets;
                    hxdec.ready();
                }
                else {
                    hxdec.error("No set data found from scryfall");
                    console.log("No set data found from scryfall", resp);
                }
                return;
            }
            hxdec.error("No set data found from scryfall");
            console.log("No set data found from scryfall", resp);
            return;
        })
            .catch((err) => {
            hxdec.error("Error fetching set data from scryfall");
            console.error("Error fetching set data from scryfall", err);
            return;
        });
    },
    getCardData: async (cards, properties, callback) => {
        // fetch all cards from scryfall
        const batchSize = 75; // scryfall allows up to 75 identifiers per request
        const delay = 500; // delay in ms between requests to avoid hitting rate limits
        const cardInfos = [];
        //delay each request by the specified delay to avoid hitting rate limits
        for (let i = 0; i < cards.length; i += batchSize) {
            const chunk = cards.slice(i, i + batchSize);
            const identifiers = chunk.map(card => {
                if (card.set && card.number) {
                    return {
                        set: card.set,
                        collector_number: String(card.number)
                    };
                }
                else if (card.name) {
                    return {
                        name: card.name
                    };
                }
                else {
                    return null;
                }
            }).filter(id => id !== null);
            if (identifiers.length === 0) {
                continue;
            }
            fetch("https://api.scryfall.com/cards/collection", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ identifiers })
            })
                .then(resp => resp.json())
                .then(resp => {
                if (resp.data && resp.data.length > 0) {
                    cardInfos.push(...resp.data);
                    if (cardInfos.length >= cards.length) {
                        // all card info has been fetched, add the card names to the cards in the decoded data
                        cards.forEach((card, index) => {
                            let cardInfo = {};
                            if (typeof card.name !== "undefined" && (typeof card.set === "undefined" || typeof card.number === "undefined")) {
                                cardInfo = cardInfos.find(info => info.name.toLowerCase() === card.name.toLowerCase()) || {};
                            }
                            else if ((typeof card.set !== "undefined" && typeof card.number !== "undefined") && typeof card.name === "undefined") {
                                cardInfo = cardInfos.find(info => info.set.toLowerCase() === card.set.toLowerCase() && info.collector_number === String(card.number)) || {};
                            }
                            if (cardInfo && Object.keys(cardInfo).length !== 0) {
                                properties.forEach(prop => {
                                    if (typeof cardInfo[prop] !== "undefined") {
                                        cards[index][prop] = cardInfo[prop];
                                    }
                                });
                            }
                            else {
                                console.log(`No card info found for card: ${card.name} with set: ${card.set} and number: ${card.number}`);
                            }
                            // console.log("card", card, cardInfo);
                        });
                        // if all batches have been processed, call the callback with the updated cards
                        if (cardInfos.length >= cards.length) {
                            callback(cards);
                        }
                    }
                    // console.log("Fetched card info from scryfall:", resp.data);
                }
                else {
                    console.log("No card info found from scryfall for identifiers:", identifiers, resp);
                }
            })
                .catch(err => {
                console.error("Error fetching card info from scryfall for identifiers:", identifiers, err);
            });
            // wait 500ms before next request
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        return;
    },
    digestCard: (line) => {
        var _a;
        const splitIndex = line.indexOf(" ");
        let name = line.substring(splitIndex + 1).trim();
        const newCard = {
            name,
            qty: Number(line.substring(0, splitIndex).trim().replace("x", "")),
            set: "",
            foil: "",
            cat: "",
            tags: "",
            collectorNumber: "",
            hxcode: "",
            hxnumber: "",
        };
        const trimValue = (property, start, end) => {
            const regex = new RegExp(`\\${start}([^\\${end}]*)\\${end}`);
            const match = name.match(regex);
            let replaceSymbol = "";
            if (start === "(")
                replaceSymbol = `::::`;
            // get the matched value without the start and end symbols and assign it to newCard with the property name as the key
            if (match && match[1]) {
                newCard[property] = match[1].trim();
                name = name.replace(regex, replaceSymbol);
                // console.log('newCard:', newCard, match[1]);
            }
        };
        trimValue("set", "(", ")");
        trimValue("foil", "*", "*");
        trimValue("cat", "[", "]");
        trimValue("tags", "^", "^");
        const nameSplit = name.split("::::");
        name = nameSplit[0].trim();
        if (nameSplit.length > 1) {
            newCard.collectorNumber = nameSplit[1].trim();
        }
        if (typeof newCard.set !== "undefined") {
            newCard.hxcode = ((_a = hxdec.setData.find(s => s.code.toLowerCase() === newCard.set.toLowerCase())) === null || _a === void 0 ? void 0 : _a.hxcode) || null;
        }
        if (typeof newCard.collectorNumber !== "undefined") {
            // if collector number is just a number, convert to hex and pad to 3 digits
            if (/^\d+$/.test(newCard.collectorNumber)) {
                const hxnumber = Number(newCard.collectorNumber).toString(16);
                newCard.hxnumber = hxnumber;
            }
            else {
                newCard.hxnumber = `~${newCard.collectorNumber}~`;
            }
        }
        return newCard;
    },
    encoded: (list) => {
        console.log("hxdec.encoded: ", list);
    },
    decoded: (list) => {
        console.log("hxdec.decoded: ", list);
    },
    ready: () => {
        console.log("hxdec.ready: ready to encode and decode");
    },
    loading: (status) => {
        console.log("hxdec.loading: ", status);
    },
    warning: (message) => {
        console.log("HXDEC Warning:", message);
    },
    error: (message) => {
        console.log("HXDEC Error:", message);
    }
};
exports.default = hxdec;
//# sourceMappingURL=index.js.map