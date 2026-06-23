"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const package_json_1 = __importDefault(require("../package.json"));
const hxdec = {
    setData: [], // to be populated with set data from scryfall on init
    go: (opt) => {
        opt.fetchSetData = typeof opt.fetchSetData !== "undefined" ? opt.fetchSetData : true;
        opt.fetchCardData = typeof opt.fetchCardData !== "undefined" ? opt.fetchCardData : true;
        const delgateList = () => {
            if (typeof opt.list === "string") {
                opt.format = opt.format || "hxdec";
                opt.format = opt.format.toLowerCase();
                const acceptedFormats = ["archideckt", "moxfield", "arena", "mtgo", "hxdec"];
                if (acceptedFormats.indexOf(opt.format) === -1) {
                    hxdec.error(`"${opt.format}" is not a supported output format. Supported output formats are... "archideckt", "moxfield", "arena", "mtgo" and "hxdec"`);
                    return;
                }
                if (hxdec.isHxdec(opt.list)) {
                    hxdec.loading("Processing HXDEC deck list");
                    // HXDEC string detected, decode it
                    if (opt.format === "hxdec") {
                        hxdec.warning("You attempted to decode a hxdec string and output it as the same hxdec format. Please specify a different supported format to convert to, such as 'MTGO', 'Arena', 'Archideckt', or 'Moxfield'. Defaulting to Archideckt format output.");
                        opt.format = "archideckt";
                    }
                    hxdec.digestHxdec(opt.list, listData => {
                        hxdec.getMissingCardData(listData, updatedData => {
                            const sortedListData = hxdec.sortListData(updatedData);
                            hxdec.buildList(sortedListData, opt.format, newList => {
                                hxdec.encoded(newList);
                                hxdec.ready();
                            });
                        });
                    });
                }
                else {
                    hxdec.loading("Processing traditional deck list");
                    // regular deck list detected, encode it
                    hxdec.digestList(opt.list, listData => {
                        hxdec.getMissingCardData(listData, updatedData => {
                            const sortedListData = hxdec.sortListData(updatedData);
                            if (opt.format === "hxdec") {
                                hxdec.buildHxdec(sortedListData, opt.foil || false, opt.tags || false, opt.category || false, (hxdecList) => {
                                    hxdec.encoded(hxdecList);
                                    hxdec.ready();
                                });
                            }
                            else {
                                hxdec.buildList(sortedListData, opt.format, newList => {
                                    hxdec.encoded(newList);
                                    hxdec.ready();
                                });
                            }
                        });
                    });
                }
                return;
            }
            hxdec.error("No deck list provided to hxdec.go. Please format your call like hxdec.go({ list: 'your deck list here', format: 'optional output format here', foil: true/false, tags: true/false, category: true/false })");
            return;
        };
        if (hxdec.setData.length === 0) {
            hxdec.init(true, () => delgateList());
            return;
        }
        delgateList();
        return;
    },
    getListData: (opt) => {
        opt.fetchSetData = typeof opt.fetchSetData !== "undefined" ? opt.fetchSetData : true;
        opt.fetchCardData = typeof opt.fetchCardData !== "undefined" ? opt.fetchCardData : true;
        const delgateList = () => {
            if (typeof opt.list === "string") {
                if (hxdec.isHxdec(opt.list)) {
                    hxdec.loading("Processing HXDEC deck list");
                    hxdec.digestHxdec(opt.list, listData => {
                        if (opt.fetchCardData === true) {
                            hxdec.getMissingCardData(listData, updatedData => {
                                const sortedListData = hxdec.sortListData(updatedData);
                                hxdec.encoded({ format: "data", data: sortedListData });
                                hxdec.ready();
                            });
                            return;
                        }
                        const sortedListData = hxdec.sortListData(listData);
                        hxdec.encoded({ format: "data", data: sortedListData });
                        hxdec.ready();
                        return;
                    });
                }
                else {
                    hxdec.loading("Processing traditional deck list");
                    // regular deck list detected, encode it
                    hxdec.digestList(opt.list, listData => {
                        if (opt.fetchCardData === true) {
                            hxdec.getMissingCardData(listData, updatedData => {
                                const sortedListData = hxdec.sortListData(updatedData);
                                hxdec.encoded({ format: "data", data: sortedListData });
                                hxdec.ready();
                            });
                            return;
                        }
                        const sortedListData = hxdec.sortListData(listData);
                        hxdec.encoded({ format: "data", data: sortedListData });
                        hxdec.ready();
                        return;
                    });
                }
                return;
            }
            hxdec.error("No deck list provided to hxdec.go. Please format your call like hxdec.go({ list: 'your deck list here', format: 'optional output format here', foil: true/false, tags: true/false, category: true/false })");
            return;
        };
        if (hxdec.setData.length === 0) {
            hxdec.init(opt.fetchSetData, () => delgateList());
            return;
        }
        delgateList();
        return;
    },
    isHxdec: (list) => {
        const strippedList = list.replace(/\[(.*?)\]/g, "").replace(/\*(.*?)\*/g, "").replace(/\^(.*?)\^/g, "").replace(/~(.*?)~/g, "").replace(/\+(.*?)\+/g, "");
        const hxdecPattern = /^h[uvwxyzksmpabcdef\d]*$/;
        return hxdecPattern.test(strippedList);
    },
    init: (fetchSetData = true, callback) => {
        // fetch all sets from scryfall and prepare them for initial firebase upload
        const localObject = () => {
            // Extend the storage object to allow for setting and getting objects in local storage
            Storage.prototype.setObject = function (key, value) {
                this.setItem(key, JSON.stringify(value));
            };
            Storage.prototype.getObject = function (key) {
                const value = this.getItem(key);
                return value && JSON.parse(value);
            };
            return null;
        };
        localObject();
        const cachedSetData = localStorage.getObject('hxdecSetData');
        console.log('cachedSetData', cachedSetData);
        const now = new Date().getTime();
        const day = 1000 * 60 * 60 * 24;
        if (cachedSetData && now - cachedSetData.age < 10 * day) {
            hxdec.setData = cachedSetData.sets;
            hxdec.loading("Using cached set data");
            callback();
            return;
        }
        if (!fetchSetData) {
            callback();
            return;
        }
        hxdec.loading("Fetching set data from scryfall");
        fetch("https://api.scryfall.com/sets", {
            headers: {
                "Content-Type": "application/json",
                "User-Agent": `hxdec/${package_json_1.default.version}`,
                "Accept": "application/json",
            }
        })
            .then((resp) => resp.json())
            .then((resp) => {
            if (resp.data && resp.data.length > 0) {
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
                        const hx_set = Number(setCounter).toString(16).padStart(3, "0");
                        const newSet = {
                            date: new Date(set.released_at).getTime(),
                            code: set.code,
                            hx_set
                        };
                        sets.push(newSet);
                        setCounter++;
                    }
                });
                if (sets.length > 0) {
                    hxdec.setData = sets;
                    localStorage.setObject('hxdecSetData', { sets, age: new Date().getTime() });
                    callback();
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
    digestHxdec: (list, callback) => {
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
        const nameValue = captureWrappedValues("+", "+", /\+(.*)\+/g);
        const decodedData = { name: "", cards: [] };
        if (nameValue.length > 0) {
            decodedData.name = decodeURIComponent(nameValue[0]);
        }
        list = list.replace(/\+(.*)\+/g, ""); // remove the name from the list string so it doesn't interfere with section splitting
        const sections = list.split(/(?=[hksm])/);
        sections.forEach(section => {
            const type = section[0];
            const data = section.substring(1);
            const cardCodes = data.split(/(?=[uvwxyz])/);
            const target_section = type === "h" ? "mainboard" : type === "k" ? "commander" : type === "s" ? "sideboard" : type === "m" ? "maybeboard" : null;
            if (target_section) {
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
                    let foil = "";
                    if (code.includes("*")) {
                        const foilMatch = code.match(/\*(.*?)\*/);
                        if (foilMatch) {
                            foil = foilValues[parseInt(foilMatch[1])];
                            code = code.replace(foilMatch[0], "");
                        }
                    }
                    // if code contains ^, extract the tag value and remove it from the code
                    let tags = "";
                    if (code.includes("^")) {
                        const tagMatch = code.match(/\^(.*?)\^/);
                        if (tagMatch) {
                            tags = tagValues[parseInt(tagMatch[1])];
                            code = code.replace(tagMatch[0], "");
                        }
                    }
                    // if code contains [ ], extract the category value and remove it from the code
                    let category = "";
                    if (code.includes("[")) {
                        const categoryMatch = code.match(/\[(.*?)\]/);
                        if (categoryMatch) {
                            category = categoryValues[parseInt(categoryMatch[1])];
                            code = code.replace(categoryMatch[0], "");
                        }
                    }
                    let numberHx = code.substring(3);
                    let number = Number(parseInt(numberHx, 16)).toString();
                    if (isNaN(parseInt(number)) && numberHx.includes("~")) {
                        number = textSets[parseInt(numberHx.replace("~", ""))];
                        numberHx = `~${number}~`;
                    }
                    else if (isNaN(parseInt(number))) {
                        console.log(`Invalid collector number hex: ${numberHx} for code: ${code}`);
                    }
                    let set = "";
                    // find set in set data
                    if (hxdec.setData.length > 0) {
                        const setInfo = hxdec.setData.find(s => s.hx_set === setHx);
                        if (setInfo) {
                            set = setInfo.code;
                        }
                    }
                    else {
                        console.log('Cannot get set, no set data available. Set "fetchSetData: true" in your options when decoding HXDEC strings.');
                    }
                    const newCard = { name: "", qty, set, hx_set: setHx, collector_number: number, hx_collector_number: numberHx, foil, tags, category, target_section, isComplete: false };
                    cards.push(newCard);
                });
                decodedData.cards.push(...cards);
                return;
            }
            console.log(`Unknown section type: ${type} in section: ${section}`);
            return;
        });
        callback(decodedData);
        return;
    },
    digestList: (list, callback) => {
        if (list.length === 0) {
            hxdec.error("No deck list provided");
            return {};
        }
        const sections = list.split("\n\n");
        const listData = {
            name: "",
            cards: [],
        };
        let target_section = "mainboard"; // default section target
        sections.forEach((section) => {
            const sec = section.split("\n");
            sec.forEach((line, index) => {
                line = line.trim();
                // if  line doesnt start with a number followed by " " or "x ", It is not a card line.  Check to see if its a section title and then, assign  the target_section based on the title.  If the title is "About" and it is the first line of the first section, check to see if the second line starts with "Name " and if so, capture the deck name from that line and assign it to listData.name.  If the line is not a card line or a section header, skip it.
                if (!/^\d+x?\s/.test(line)) {
                    const titleLine = line.toLowerCase().replace(":", "");
                    console.log(`Processing section by title: ${titleLine}`);
                    if (titleLine === "commander" || titleLine === "sideboard" || titleLine === "maybeboard" || titleLine === "mainboard") {
                        target_section = titleLine;
                    }
                    if (titleLine === "deck") {
                        target_section = "mainboard";
                    }
                    if (titleLine === "about" && index === 0 && /^Name\s/.test(sec[1])) {
                        listData.name = sec[1].split("Name")[1].trim();
                    }
                    return;
                }
                else if (sec.length < 3 && index === 0) {
                    // 1-2 separate lines with no section headerde notes commanders for some formats
                    target_section = "commander";
                }
                const newCard = hxdec.digestCard(line);
                newCard.isComplete = newCard.hx_set.length > 0 && newCard.hx_collector_number.length > 0 && newCard.name.length > 0;
                listData.cards.push(Object.assign(Object.assign({}, newCard), { target_section }));
            });
        });
        callback(listData);
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
            category: "",
            tags: "",
            collector_number: "",
            hx_set: "",
            hx_collector_number: "",
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
        trimValue("category", "[", "]");
        trimValue("tags", "^", "^");
        const nameSplit = name.split("::::");
        name = nameSplit[0].trim();
        newCard.name = name;
        newCard.set = newCard.set.toLowerCase();
        if (nameSplit.length > 1) {
            newCard.collector_number = nameSplit[1].trim();
        }
        if (newCard.set.length > 0) {
            newCard.hx_set = ((_a = hxdec.setData.find(s => s.code.toLowerCase() === newCard.set.toLowerCase())) === null || _a === void 0 ? void 0 : _a.hx_set) || "";
        }
        if (newCard.collector_number.length > 0) {
            // if collector number is just a number, convert to hex and pad to 3 digits
            if (/^\d+$/.test(newCard.collector_number)) {
                const hx_collector_number = Number(newCard.collector_number).toString(16);
                newCard.hx_collector_number = hx_collector_number;
            }
            else {
                newCard.hx_collector_number = `~${newCard.collector_number}~`;
            }
        }
        return newCard;
    },
    sortListData: (listData) => {
        // sort the listData into a new object with keys for each section and the cards in arrays under those keys based on the target_section property of each card
        const sortedListData = {
            name: listData.name,
            mainboard: [],
            commander: [],
            sideboard: [],
            maybeboard: []
        };
        listData.cards.forEach((card) => {
            delete card.isComplete;
            delete card.updated;
            sortedListData[card.target_section].push(card);
        });
        // If this is a type of format that lists a commander as the first card in the mainboard section without a section header, move it to the commander section and remove it from the mainboard section
        if (sortedListData.mainboard.length > 0 && sortedListData.commander.length === 0) {
            // count the number of cards in the mainboard
            let mainboardCount = 0;
            sortedListData.mainboard.forEach((mainboardCard) => {
                mainboardCount += mainboardCard.qty || 0;
            });
            if (mainboardCount === 100) {
                // Mainboard has exactly 100 cards and no commander specified, treating first card as commander
                sortedListData.commander = [sortedListData.mainboard[0]];
                sortedListData.commander[0].target_section = "commander";
                sortedListData.mainboard = sortedListData.mainboard.slice(1);
            }
        }
        if (sortedListData.commander.length === 0)
            delete sortedListData.commander;
        if (sortedListData.sideboard.length === 0)
            delete sortedListData.sideboard;
        if (sortedListData.maybeboard.length === 0)
            delete sortedListData.maybeboard;
        return sortedListData;
    },
    buildHxdec: (listData, foil = false, tags = false, cat = false, callback) => {
        // build the hxdec string based on the listData and setData
        listData.mainboard = listData.mainboard || [];
        listData.commander = listData.commander || [];
        listData.sideboard = listData.sideboard || [];
        listData.maybeboard = listData.maybeboard || [];
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
                cardString += card.hx_set;
                cardString += card.hx_collector_number;
                if (foil && card.foil.length > 0) {
                    cardString += `*${card.foil}*`;
                }
                if (tags && card.tags.length > 0) {
                    cardString += `^${card.tags}^`;
                }
                if (cat && card.categoy.length > 0) {
                    cardString += `[${card.category}]`;
                }
                newCards += cardString;
            });
            return newCards;
        };
        if (listData.mainboard.length === 0 || listData.mainboard.length === 0) {
            hxdec.error("No mainboard cards found, cannot build HXDEC");
            return;
        }
        let newList = `h${outputCards(listData.mainboard)}`;
        if (listData.commander.length > 0) {
            newList += `k${outputCards(listData.commander)}`;
        }
        if (listData.sideboard.length > 0) {
            newList += `s${outputCards(listData.sideboard)}`;
        }
        if (listData.maybeboard.length > 0) {
            newList += `m${outputCards(listData.maybeboard)}`;
        }
        if (listData.name.length > 0) {
            newList += `+${encodeURIComponent(listData.name)}+`;
        }
        callback({ format: "hxdec", list: newList, data: listData });
        return;
    },
    buildList: (decodedData, format = "archideckt", callback) => {
        // build a traditional deck list from sorted decoded data set
        format = format.toLowerCase();
        let formatOptions = {
            mainboardTitle: "",
            commanderTitle: "",
            sideboardTitle: "",
            maybeboardTitle: "",
            nameTitle: "",
            name: false,
            sets: false,
            collectorNumber: false,
            foil: false,
            category: false,
            tags: false,
            order: ["commander", "mainboard", "sideboard", "maybeboard"]
        };
        if (format === "archideckt") {
            formatOptions = Object.assign(Object.assign({}, formatOptions), { mainboardTitle: "\nMainboard\n", commanderTitle: "\nCommander\n", sideboardTitle: "\nSideboard\n", maybeboardTitle: "\nMaybeboard\n", sets: true, collectorNumber: true, foil: true, category: true, tags: true });
        }
        if (format === "mtgo") {
            formatOptions = Object.assign(Object.assign({}, formatOptions), { sideboardTitle: "\nSIDEBOARD:\n", commanderTitle: "\n", order: ["mainboard", "sideboard", "commander", "maybeboard"] });
        }
        if (format === "arena") {
            formatOptions = Object.assign(Object.assign({}, formatOptions), { mainboardTitle: "\nDeck\n", commanderTitle: "\nCommander\n", sideboardTitle: "\nSideboard\n", nameTitle: "About\nName ", name: true });
        }
        if (format === "moxfield") {
            formatOptions = Object.assign(Object.assign({}, formatOptions), { sideboardTitle: "\nSIDEBOARD:\n", sets: true, collectorNumber: true, foil: true });
        }
        let newList = "";
        if (formatOptions.name && decodedData.name) {
            newList += `${formatOptions.nameTitle}${decodedData.name}\n`;
        }
        const buildCardLine = (card) => {
            if (format === "moxfield") {
                card.set = card.set.toUpperCase();
            }
            let line = `${card.qty} ${card.name}`;
            if (formatOptions.sets && card.set) {
                line += ` (${card.set})`;
            }
            if (formatOptions.collectorNumber && card.collector_number) {
                line += ` ${card.collector_number}`;
            }
            if (formatOptions.foil && card.foil) {
                line += ` *${card.foil}*`;
            }
            if (formatOptions.category && card.category) {
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
        callback({ format, list: newList, data: decodedData });
    },
    getMissingCardData: (listData, callback) => {
        const incompleteCards = listData.cards.filter((card) => !card.isComplete);
        const updatedCards = [];
        // delete the cards that are missing data from "cards" in listData so they can be readded with the full data after fetching from scryfall
        if (incompleteCards.length > 0) {
            listData.cards = listData.cards.filter((card) => card.isComplete);
            hxdec.getCardData(incompleteCards, ["name", "set", "collector_number"], (cards) => {
                cards.forEach((card) => {
                    var _a;
                    // add each card to its target section and update the hx_set and hx_collector_number based on the set and collector number
                    if (card.set.length > 0 && card.collector_number.length > 0 && hxdec.setData.length > 0) {
                        card.hx_set = ((_a = hxdec.setData.find(s => s.code.toLowerCase() === card.set.toLowerCase())) === null || _a === void 0 ? void 0 : _a.hx_set) || null;
                        card.isComplete = true;
                        if (card.hx_set) {
                            if (/^\d+$/.test(card.collector_number)) {
                                card.hx_collector_number = Number(card.collector_number).toString(16);
                            }
                            else {
                                card.hx_collector_number = `~${card.collector_number}~`;
                            }
                        }
                        else {
                            hxdec.warning(`No set data found for set: ${card.set} on card: ${card.name}`);
                        }
                        updatedCards.push(card);
                    }
                    else {
                        console.log('Card still not complete after fetching data:', card);
                    }
                });
                listData.cards = [...listData.cards, ...updatedCards];
                callback(listData);
            });
            return;
        }
        callback(listData);
        return;
    },
    getCardData: async (cards, properties, callback) => {
        // fetch all cards from scryfall
        const batchSize = 75; // scryfall allows up to 75 identifiers per request
        const delay = 500; // delay in ms between requests to avoid hitting rate limits
        const cardInfos = [];
        let requestedCardsCount = 0;
        //delay each request by the specified delay to avoid hitting rate limits
        for (let i = 0; i < cards.length; i += batchSize) {
            const chunk = cards.slice(i, i + batchSize);
            const identifiers = chunk.map(card => {
                if (card.set && card.collector_number) {
                    return {
                        set: card.set,
                        collector_number: String(card.collector_number)
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
                    "Content-Type": "application/json",
                    "User-Agent": `hxdec/${package_json_1.default.version}`,
                    "Accept": "application/json",
                },
                body: JSON.stringify({ identifiers })
            })
                .then(resp => resp.json())
                .then(resp => {
                if (resp.data && resp.data.length > 0) {
                    cardInfos.push(...resp.data);
                    requestedCardsCount += identifiers.length;
                    if (requestedCardsCount >= cards.length) {
                        // all card info has been fetched, add the card names to the cards in the decoded data
                        cards.forEach((card, index) => {
                            let cardInfo = {};
                            if (card.name.length > 0 && (card.set.length === 0 || card.collector_number.length === 0)) {
                                cardInfo = cardInfos.find(info => info.name.toLowerCase() === card.name.toLowerCase()) || {};
                            }
                            else if ((card.set.length > 0 && card.collector_number.length > 0) && card.name.length === 0) {
                                cardInfo = cardInfos.find(info => info.set.toLowerCase() === card.set.toLowerCase() && info.collector_number === String(card.collector_number)) || {};
                            }
                            if (cardInfo && Object.keys(cardInfo).length !== 0) {
                                properties.forEach(prop => {
                                    if (typeof cardInfo[prop] !== "undefined" && cards[index][prop] === "") {
                                        cards[index][prop] = cardInfo[prop];
                                        cards[index].updated = true;
                                    }
                                });
                            }
                            else {
                                console.log(`No card info found for card: ${card.name} with set: ${card.set} and collector number: ${card.collector_number}`);
                            }
                            // console.log("card", card, cardInfo);
                        });
                        // if all batches have been processed, call the callback with the updated cards
                        if (requestedCardsCount >= cards.length) {
                            //console.log("All card info has been fetched, calling callback with updated cards");
                            const missingInfoCards = cards.filter(c => !c.updated);
                            if (missingInfoCards.length > 0) {
                                console.log("Could not update cards:", missingInfoCards, "Using card info:", cardInfos);
                            }
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
    encoded: (deck) => {
        console.log("hxdec.encoded: ", deck);
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