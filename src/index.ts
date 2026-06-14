import packageJson from '../package.json';

type Obj = {
    [key: string]: any;
}

const hxdec = {
    setData: [] as Obj[], // to be populated with set data from scryfall on init
    go: (opt: Obj) => {
        if (opt.list) {
            opt.format = opt.format || "archideckt";
            opt.format = opt.format.toLowerCase();
            const strippedList = opt.list.replaceAll(/\[(.*?)\]/, "").replaceAll(/\*(.*?)\*/g, "").replaceAll(/\^(.*?)\^/g, "").replaceAll(/~(.*?)~/g, "").replaceAll(/\+(.*?)\+/g, "");
            if (strippedList.test(/^h[uvwxyzksmpabcdef\d]*$/)) {
                // HXDEC string detected, decode it
                if (opt.format === "hxdec") {
                    hxdec.warning("You attempted to decode a hxdec string and output it as the same hxdec format. Please specify a different supported format to convert to, such as 'MTGO', 'Arena', 'Archideckt', or 'Moxfield'. Defaulting to Archideckt format output.");
                    opt.format = "archideckt";
                }
                hxdec.decode(opt.list, opt.format);
            } else {
                // regular deck list detected, encode it
                hxdec.encode(opt.list, opt.foil || false, opt.tags || false, opt.cat || false, opt.format || "hxdec");
            }
        } else {
            hxdec.error("No deck list provided to hxdec.go. Please format your call like hxdec.go({ list: 'your deck list here', format: 'optional output format here', foil: true/false, tags: true/false, cat: true/false })");
        }
    },
    encode: (list: string, foil = false, tags = false, cat = false, format = "hxdec") => {
        // Encode a traditional deck list into a HXDEC string or other supported format based on the specified output format
        if (hxdec.setData.length === 0) {
            hxdec.error("Set data not ready yet, cannot encode");
            return;
        }
        hxdec.loading("Processing deck list");
        hxdec.digestList(list, listData => {
            hxdec.getMissingCardData(listData, updatedData => {
                const sortedListData = hxdec.sortListData(updatedData);
                if (format === "hxdec") {
                    hxdec.buildHxdec(sortedListData, foil, tags, cat, (hxdecList) => {
                        hxdec.ready();
                        hxdec.encoded(hxdecList);
                    });
                } else {
                    hxdec.buildList(sortedListData, format, newList => {
                        hxdec.ready();
                        hxdec.encoded(newList);
                    });
                }
            });
        });
    },
    decode: (list: string, format = "archideckt") => {
        // Decode a HXDEC string into a traditional deck list format based on the specified output format
        if (hxdec.setData.length === 0) {
            console.log("Set data not ready yet, cannot decode");
            return;
        }
        hxdec.loading("Decoding HXDEC string");
        // Decoding logic to be implemented
        // remove values wrapped and store them in an array, replace them in the deck string with their index in the array wrapped in thier original wrap symbol so they can be reinserted after splitting the string into sections
        const captureWrappedValues = (wrap1: string, wrap2: string, regex: RegExp) => {
            const capturedValues = [] as string[];
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
        const decodedData = { name: "", cards: [] } as Obj;
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
                const cards = [] as Obj[];
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

                    const numberHx = code.substring(3);

                    let number: string = Number(parseInt(numberHx, 16)).toString();
                    if (isNaN(parseInt(number)) && numberHx.includes("~")) {
                        number = textSets[parseInt(numberHx.replace("~", ""))];
                    } else if (isNaN(parseInt(number))) {
                        console.log(`Invalid collector number hex: ${numberHx} for code: ${code}`);
                    }
                    let set = "";

                    // find set in set data
                    const setInfo = hxdec.setData.find(s => s.hxcode === setHx);
                    if (setInfo) {
                        set = setInfo.code;
                    }

                    const newCard = { name: "", code, qty, set, number, foil, tags, category, targetSection, isComplete: false } as Obj;

                    cards.push(newCard);
                });
                decodedData.cards.push(...cards);
                return;
            }
            console.log(`Unknown section type: ${type} in section: ${section}`);
            return;
        });

        hxdec.getMissingCardData(decodedData, updatedData => {
            const sortedListData = hxdec.sortListData(updatedData);
            hxdec.buildList(sortedListData, format, newList => {
                hxdec.ready();
                hxdec.decoded(newList);
            });
        });
        return;
    },
    sortListData: (listData: Obj) => {
        // sort the listData into a new object with keys for each section and the cards in arrays under those keys based on the targetSection property of each card
        const sortedListData = {
            name: listData.name,
        } as Obj;
        listData.cards.forEach((card: Obj) => {
            sortedListData[card.targetSection] = sortedListData[card.targetSection] || [];
            sortedListData[card.targetSection].push(card);
        });
        console.log("Sorted list data ready for HXDEC build:", sortedListData);
        return sortedListData;
    },
    buildHxdec: (listData: Obj, foil = false, tags = false, cat = false, callback: (hxdecList: string) => void) => {
        // build the hxdec string based on the listData and setData
        const outputCards = (rawCards: Obj[]) => {
            let newCards = ""
            rawCards.forEach(card => {
                const qtyChars = ["u", "v", "w", "x", "y", "z"];
                let cardString = "";
                if (card.qty >= 1 && card.qty <= 4) {
                    cardString += qtyChars[card.qty - 1];
                } else if (card.qty > 4 && card.qty < 16) {
                    const qtyHex = Number(card.qty).toString(16);
                    cardString += `y${qtyHex}`;
                } else if (card.qty >= 16 && card.qty < 256) {
                    const qtyHex = Number(card.qty).toString(16);
                    cardString += `z${qtyHex}`;
                } else {
                    cardString += "zff";
                }
                cardString += card.hxcode;
                cardString += card.hxnumber;
                if (foil && card.foil.length > 0) {
                    cardString += `*${card.foil}*`;
                }
                if (tags && card.tags.length > 0) {
                    cardString += `^${card.tags}^`;
                }
                if (cat && card.cat.length > 0) {
                    cardString += `[${card.cat}]`;
                }
                newCards += cardString;
            });
            return newCards;
        }
        if (listData.mainboard.length === 0 || listData.mainboard.length === 0) {
            hxdec.error("No mainboard cards found, cannot build HXDEC");
            return;
        }
        // If this is a type of format that lists a commander as the first card in the mainboard section without a section header, move it to the commander section and remove it from the mainboard section
        if (listData.mainboard.length > 0 && listData.commander.length === 0) {
            // count the number of cards in the mainboard
            let mainboardCount = 0;
            listData.mainboard.forEach((mainboardCard: Obj) => {
                mainboardCount += mainboardCard.qty;
            });
            if (mainboardCount > 98) {
                // Mainboard has more than 98 cards and no commander specified, treating first card as commander
                listData.commander = [listData.mainboard[0]];
                listData.mainboard = listData.mainboard.slice(1);
            }
        }
        let deck = `h${outputCards(listData.mainboard)}`;
        if (listData.commander.length > 0) {
            deck += `k${outputCards(listData.commander)}`;
        }
        if (listData.sideboard.length > 0) {
            deck += `s${outputCards(listData.sideboard)}`;
        }
        if (listData.maybeboard.length > 0) {
            deck += `m${outputCards(listData.maybeboard)}`;
        }
        if (listData.companion.length > 0) {
            deck += `p${outputCards(listData.companion)}`;
        }
        if (listData.name.length > 0) {
            deck += `+${encodeURIComponent(listData.name)}+`;
        }
        callback(deck);
        return;

    },
    buildList: (decodedData: Obj, format = "archideckt", callback: (newList: string) => void) => {
        // build a traditional deck list from sorted decoded data set
        format = format.toLowerCase();
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
        } as Obj;
        if (format === "archideckt") {
            formatOptions = {
                ...formatOptions,
                mainboardTitle: "\nMainboard\n",
                commanderTitle: "\nCommander\n",
                sideboardTitle: "\nSideboard\n",
                maybeboardTitle: "\nMaybeboard\n",
                companionTitle: "\nCompanion\n",
                sets: true,
                collectorNumber: true,
                foil: true,
                cat: true,
                tags: true,
            }
        }
        if (format === "mtgo") {
            formatOptions = {
                ...formatOptions,
                sideboardTitle: "\nSIDEBOARD:\n",
                commanderTitle: "\n",
                order: ["mainboard", "companion", "sideboard", "commander", "maybeboard"]
            }
        }
        if (format === "arena") {
            formatOptions = {
                ...formatOptions,
                mainboardTitle: "\nDeck\n",
                commanderTitle: "\nCommander\n",
                sideboardTitle: "\nSideboard\n",
                nameTitle: "About\nName ",
                name: true,
            }
        }
        if (format === "moxfield") {
            formatOptions = {
                ...formatOptions,
                sideboardTitle: "\nSIDEBOARD:\n",
                sets: true,
                collectorNumber: true,
                foil: true,
            }
        }

        let newList = "";
        if (formatOptions.name && decodedData.name) {
            newList += `${formatOptions.nameTitle}${decodedData.name}\n`;
        }
        const buildCardLine = (card: Obj) => {
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
        }
        const renderSection = (section: Obj[], title: string) => {
            if (section && section.length > 0) {
                newList += title;
                section.forEach(card => {
                    newList += buildCardLine(card) + "\n";
                });
            }
        }
        formatOptions.order.forEach((sectionKey: string) => {
            if (decodedData[sectionKey]) {
                const title = formatOptions[`${sectionKey}Title`] || "";
                renderSection(decodedData[sectionKey], title);
            }
        });

        // trim the final newList and set it to the output
        newList = newList.trim();
        callback(newList);
    },
    init: () => {
        // fetch all sets from scryfall and prepare them for initial firebase upload
        if (hxdec.setData.length > 0) {
            console.log("Set data already processed, skipping fetch");
            return;
        }
        hxdec.loading("Fetching set data from scryfall");
        fetch("https://api.scryfall.com/sets", {
            headers: {
                "Content-Type": "application/json",
                "User-Agent": `hxdec/${packageJson.version}`,
                "Accept": "application/json",
            }
        }
        )
            .then((resp) => resp.json())
            .then((resp) => {
                if (resp.data && resp.data.length > 0) {
                    const sets = [] as Obj[];
                    const initSetsData = resp.data;
                    // sort initSetsData by release date ascending
                    initSetsData.sort((a: Obj, b: Obj) => {
                        const dateA = new Date(a.released_at).getTime();
                        const dateB = new Date(b.released_at).getTime();
                        return dateA - dateB;
                    });
                    let setCounter = 1;
                    initSetsData.forEach((set: Obj) => {
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
                    } else {
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
    digestList: (list: string, callback: (listData: Obj) => void) => {
        if (list.length === 0) {
            hxdec.error("No deck list provided");
            return {} as Obj;
        }
        const sections = list.split("\n\n");
        const listData = {
            name: "",
            cards: [] as Obj[],
        } as Obj;
        let targetSection = "mainboard"; // default section target
        sections.forEach((section) => {
            const sec = section.split("\n");
            sec.forEach((line, index) => {
                line = line.trim();

                // if  line doesnt start with a number followed by " " or "x ", It is not a card line.  Check to see if its a section title and then, assign  the targetSection based on the title.  If the title is "About" and it is the first line of the first section, check to see if the second line starts with "Name " and if so, capture the deck name from that line and assign it to listData.name.  If the line is not a card line or a section header, skip it.
                if (!/^\d+x?\s/.test(line)) {
                    const titleLine = line.toLowerCase().replace(":", "");
                    console.log(`Processing section by title: ${titleLine}`);
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
                } else if (sec.length < 3 && index === 0 && listData.commander.length === 0) {
                    // 1-2 separate lines with no section headerde notes commanders for some formats
                    targetSection = "commander";
                    console.log(`Processing commanders by layout`, targetSection);
                } else if (index === 0) {
                    console.log(`Processing mainboard by layout`, targetSection);
                }
                const newCard = hxdec.digestCard(line);
                newCard.isComplete = newCard.hxcode.length > 0 && newCard.hxnumber.length > 0 && newCard.name.length > 0;
                listData.cards.push({ ...newCard, targetSection });
            });
        });
        console.log("Decoded list data:", listData);
        callback(listData);

        return;
    },
    getMissingCardData: (listData: Obj, callback: (updatedData: Obj) => void) => {
        const incompleteCards = listData.cards.filter((card: Obj) => !card.isComplete);
        // delete the cards that are missing data from "cards" in listData so they can be readded with the full data after fetching from scryfall
        listData.cards = listData.cards.filter((card: Obj) => card.isComplete);

        if (incompleteCards.length > 0) {
            hxdec.getCardData(incompleteCards, ["name", "set", "collector_number"], (cards: Obj[]) => {
                cards.forEach((card: Obj) => {
                    // add each card to its target section and update the hxcode and hxnumber based on the set and collector number
                    if (card.set.length > 0 && card.collector_number.length > 0 && hxdec.setData.length > 0) {
                        card.hxcode = hxdec.setData.find(s => s.code.toLowerCase() === card.set.toLowerCase())?.hxcode || null;
                        if (card.hxcode) {
                            const collectorNumber = card.collector_number;
                            if (/^\d+$/.test(collectorNumber)) {
                                card.hxnumber = Number(collectorNumber).toString(16);
                            } else {
                                card.hxnumber = `~${collectorNumber}~`;
                            }
                        } else {
                            hxdec.warning(`No set data found for set: ${card.set} on card: ${card.name}`);
                        }
                        listData.cards.push(card);
                    }
                });
                console.log("Decoded list data and fetched missing card info from scryfall:", listData);
                callback(listData);
            });
        }
    },
    digestCard: (line: string) => { //split at first space
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
        } as Obj;
        const trimValue = (property: string, start: string, end: string) => {
            const regex = new RegExp(`\\${start}([^\\${end}]*)\\${end}`);
            const match = name.match(regex);
            let replaceSymbol = "";
            if (start === "(") replaceSymbol = `::::`;
            // get the matched value without the start and end symbols and assign it to newCard with the property name as the key
            if (match && match[1]) {
                newCard[property] = match[1].trim();
                name = name.replace(regex, replaceSymbol);
                // console.log('newCard:', newCard, match[1]);
            }
        }
        trimValue("set", "(", ")");
        trimValue("foil", "*", "*");
        trimValue("cat", "[", "]");
        trimValue("tags", "^", "^");
        const nameSplit = name.split("::::");
        name = nameSplit[0].trim();
        if (nameSplit.length > 1) {
            newCard.collectorNumber = nameSplit[1].trim();
        }
        if (newCard.set.length > 0) {
            newCard.hxcode = hxdec.setData.find(s => s.code.toLowerCase() === newCard.set.toLowerCase())?.hxcode || null;
        }
        if (newCard.collectorNumber.length > 0) {
            // if collector number is just a number, convert to hex and pad to 3 digits
            if (/^\d+$/.test(newCard.collectorNumber)) {
                const hxnumber = Number(newCard.collectorNumber).toString(16);
                newCard.hxnumber = hxnumber;
            } else {
                newCard.hxnumber = `~${newCard.collectorNumber}~`;
            }
        }
        return newCard;
    },
    getCardData: async (cards: Obj[], properties: string[], callback: (cardInfos: Obj[]) => void) => {
        // fetch all cards from scryfall
        const batchSize = 75; // scryfall allows up to 75 identifiers per request
        const delay = 500; // delay in ms between requests to avoid hitting rate limits
        const cardInfos = [] as Obj[];
        //delay each request by the specified delay to avoid hitting rate limits
        for (let i = 0; i < cards.length; i += batchSize) {
            const chunk = cards.slice(i, i + batchSize);
            const identifiers = chunk.map(card => {
                if (card.set && card.number) {
                    return {
                        set: card.set,
                        collector_number: String(card.number)
                    }
                } else if (card.name) {
                    return {
                        name: card.name
                    };
                } else {
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
                    "User-Agent": `hxdec/${packageJson.version}`,
                    "Accept": "application/json",
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
                                let cardInfo = {} as Obj;
                                if (card.name.length > 0 && (card.set.length === 0 || card.number.length === 0)) {
                                    cardInfo = cardInfos.find(info => info.name.toLowerCase() === card.name.toLowerCase()) || {} as Obj;
                                } else if ((card.set.length > 0 && card.number.length > 0) && card.name.length === 0) {
                                    cardInfo = cardInfos.find(info => info.set.toLowerCase() === card.set.toLowerCase() && info.collector_number === String(card.number)) || {} as Obj;
                                }
                                if (cardInfo && Object.keys(cardInfo).length !== 0) {
                                    properties.forEach(prop => {
                                        if (cardInfo[prop].length > 0 && cards[index][prop].length === 0) {
                                            cards[index][prop] = cardInfo[prop];
                                        }
                                    });
                                } else {
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
                    } else {
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
    encoded: (list: string) => {
        console.log("hxdec.encoded: ", list);
    },
    decoded: (list: string) => {
        console.log("hxdec.decoded: ", list);
    },
    ready: () => {
        console.log("hxdec.ready: ready to encode and decode");
    },
    loading: (status: string) => {
        console.log("hxdec.loading: ", status);
    },
    warning: (message: string) => {
        console.log("HXDEC Warning:", message);
    },
    error: (message: string) => {
        console.log("HXDEC Error:", message);
    }
};

export default hxdec;