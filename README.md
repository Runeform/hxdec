
[![HXDEC](http://edhpowerlevel.com/images/hxdec_logo.svg)](https://edhpowerlevel.com/hxdec/)


# HXDEC MTG Decklist Tool
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

HXDEC is a "Magic: the Gathering" decklist format. This library is a tool that can be used for encoding and decoding decklist in the HXDEC and other formats.






## Capabilities
The logic in this library has been organized so that you can use it to do more than just create and read HXDEC decklists.

You can...

- Convert any supported decklist type into any other supported decklist type
- Extract parsable card and deck information from supported decklist types
- Identify if a string appears to be a valid HXDEC decklist

Supported list types are...

- Moxfield
- Archideckt
- Arena
- MTGO
- HXDEC
## Implementation Guide


### Install and include the HXDEC library

Install 'hxdec' in your project using npm and import it to your project file

```bash
  npm install hxdec
```
```javascript
  import hxdec from 'hxdec';
```

### Available Functions
Evoke or redefine the following functions to use the library.

```javascript
hxdec.go(options)
hxdec.getListData(options)
hxdec.isHxdec(str)
hxdec.encoded(deck)
hxdec.ready()
hxdec.loading(message)
hxdec.warning(message)
hxdec.error(message)
```

#### **hxdec.go(options)**

Pass this function a decklist and encoding options to encode the list and get data captured from the list.

**Options**\
Options are passed in using a single Object as follows

```javascript
{
    list: 'your decklist here', 
    format: 'hxdec',
    foil: true, 
    tags: false, 
    category: false,
    fetchSetList: true,
    fetchCardSet: true,
    fetchCardName: true
}
```

| Option | Type | Default Value   | Description | Required |
| :-------- | :------- | :------- | :------- | :------------ |
| list | `string` |  | The decklist you'd like to convert| Required | 
| format | `string` | `"hxdec"` | The desired supported format you'd like to convert to.|  | 
| foil | `boolean` | `false` | If desired format is HXDEC. Include foil markers in HXDEC code.|  | 
| tags | `boolean` | `false` | If desired format is HXDEC. Include Archideckt Tags in HXDEC code.|  | 
| category | `boolean` | `false` | If desired format is HXDEC. Include Archideckt Categories in HXDEC code.|  | 
| fetchSetList | `boolean` | `true` | Choose whether you'd like HXDEC to make Scryfall requests to get a list of all sets. If set to true, HXDEC will reach out to Scryfall to get a list of current sets when necessary. If it is set to false, any fields that cannot be calculated without the set data will be left blank. If you are extracting from a HXDEC string, or converting to HXDEC format, this is required. If you are extracting from other formats and just want to parse the info represented in the list, this could be set to false.|  | 
| fetchCardSet | `boolean` | `true` | Choose whether you'd like HXDEC to make Scryfall requests to get missing set info for cards. If set to true, HXDEC will reach out to Scryfall when necessary to get the correct set for each card. If it is set to false it will leave fields empty if that information was not represented in the original decklist.|  | 
| fetchCardName | `boolean` | `true` | Choose whether you'd like HXDEC to make Scryfall requests to get missing names for cards. If set to true, HXDEC will reach out to Scryfall to get the correct card names for any card which does not have a name represented in the original decklist. This is mostly only necessary with HXDEC formatted lists. If this property is set to false, card names will be left blank if they are not represented in the original decklist.|  | 


#### **hxdec.getListData(options)**

Pass this function a decklist to get data from the list. Useful for getting parsable data from any deck list without converting to a new format.


**Options**\
This function accepts the same options Object as hxdec.go(), though less options are used.

```javascript
{
    list: 'your decklist here', 
    fetchSetList: true,
    fetchCardSet: true,
    fetchCardName: true
}
```

#### **hxdec.isHxdec(str)**

Pass this function a decklist string and it will return a boolean value that will describes whether or not the string matches HXDEC formatting.

#### **hxdec.encoded(deck)**

This is a callback function that is called when a hxdec.go or hxdec.getListData operation is complete.  Redefine this function to make use of deck results.


```javascript
hxdec.encoded = deck => {
    console.log("HXDEC done", deck);
    return;
}
```
The structure of this deck Object is as follows.
```javascript
{
    list: 'Your new formatted list', 
    format: 'format of the new list',
    data: {},

}
```
**Returned Values**
| Value | Type |  Description | 
| :-------- | :------- | :------- | 
| list | `string` | Your newly formatted decklist | 
| format | `string` | The new format of your list | 
| data | `Object` | A parable copy of the card data that was extracted from your original decklist | 


#### **hxdec.ready()**

A callback function that is called when the library has finished a loading operation and is ready to accept a new decklist. Redefine to take an action when the library is ready such as hiding loading indicators.

#### **hxdec.loading(message)**

A callback function that is called with a status message when the library is performing a loading operation, such as fetching data or processing a decklist.

#### **hxdec.warning(message)**

A callback function that is called with a warning message when the library encounters a non-critical issue during encoding or decoding.

#### **hxdec.error(message)**

A callback function that is called with an error message when the library encounters a critical issue during encoding or decoding.

## Scryfall API Usage
Since HXDEC is a decklist format that does not contain card names, interpreting or writing a HXDEC list requires card names and set information to be retrieved from a database. This script pulls both set data and card data from Scryfall's API.

Specifically, the first time it is invoked hxdec will request the latest set data from Scryfall API and cache it locally. The code will only get set data again after 10 days or if the record is deleted.

This code will reach out to Scryfall for an individual card set, collector number or name if the necessary info isn't present in the original list. For example, set and collector numbers are required to create a hxdec list. If the list being entered does not contain set or collector number information and you are attempting to encode it to 'hxdec' format, that info will be requested from Scryfall. However if the list has that info available—Both Moxfield and Archideckt do—no scryfall request will be made.

When decoding a HXDEC formatted list it will always be necessary to request card data from Scryfall to get the names of the cards as they are not stored in the HXDEC string.

When card data is requested its done in batches with a delay to respect Scryfall rate limits.
## Explanation of HXDEC Encoding
HXDEC is based on hexidecimal numbers, its really nothing new. If you are unfamiliar, you've probably seen them used to express colors before and they let you represent a larger number in a smaller number of digits by leveraging letters to count by 16s instead of 10s. Characters 0-9 and a-f are reserved for numbering while other characters can be used to represent deck structure information.

### Example List
Here is an example of a full commander decklist in HXDEC format:


```http
hu2cefcu08c17u2c4e5u2c1e0u2c1e1u2c4e7u2dc80u277bu2ce116u12be4u2d314bu08c70u2d6fu25c136u0a02bu128ccu247dau1b925u2d3b8u2e38u2d3155u2b8e1u26db6u27710u28811du18432u2a71au2b111du0246u0fe21u21aa6u28817byd2ec112u2c4efu2b8132u15cb4u204109u2a7157u2da3au2dbe3u29a16cw2ec116u2dcau14312u16b41u2d4dfu0ce102y82ec110u2e24au13722u2a73fcu2a7193u0ce12u2c14fu2d655u2a771u2bd3bu21f33u02414u2dbe7u2a738u29a17du2e268u2c1128u2b8162u2c8f3u2c8f9u2e2100u15e115u2bd1a6u2b1eeu158edu0fe30u2d3a0u21814cu083112u29a158u2d412aku25fd0+Budget Elsha Top+
```

### Parts of a card code
Each card in a HXDEC list is represented by a code looking something like this:

u25fc0

This code converts to "1 Child of Alara (2X2) 192". Lets break down the parts of the code

#### Character 1: Quantity

**u**25fc0

The quantity is represented by the first character and also serves as the separator between cards.

Characters u, v, w, and x represent quantities 1-4. For quantities 5-15, the character y is used followed by a single hexidecimal number representing the quantity. For quantities above 15, the character z is used followed by a 2-digit hexidecimal number. So in our example code, the quantity is 1 because the first character is "u".

- 1 = u
- 2 = v
- 3 = w
- 4 = x
- 5 = y5
- 10 = ya
- 15 = yf
- 16 = z10
- 31 = z1f
#### Characters 2-4: Set
u**25f**c0

The next three characters represent the set code. First we assemble every set ever printed, sort them by thier release dates. Then we simply number them, using hexidecimal numbers. This number is padded to always be 3 digits. So the very first set ever printed would be represented by the code "001".

Currently there are just over 1000 sets in Magic the Gathering. Using a 3 digit hexidecimal number allows us to represent up to 4095 sets.

Most set codes are already three characters. However, some are longer or may even include special characters. Representing them with an index like this allows us to reserve characters outside of the hexidecimal range for other purposes and ensures sets released in the future dont break our formatting.

In our example code, the set code is 25f which converts to the set "2X2"

#### Characters 5+: Collector Number
u25f**c0**

Finally we have the collector number, which is also represented in hexidecimal but is not padded like the "set" code.

Some cards such as those from "The List" (plst) set may have non-numeric collector numbers, for those cases we simply include the original text collector number wrapped in "~" characters. One of these cards might look like this: v20d~TMP-315~ . In our example the collector number is "c0" which is hexidecimal for 192.

Deck Formatting characters
In addition to the card codes, there are also characters that can be used to represent deck formatting information. These include:



|Character | Description	| 
| :-------- | :------- | 
|h| The start of a HXDEC list and the begining of the Mainboard section of the deck. This should always come first and is the only required section.|
|k| The begining of the Commanders section of the deck.|
|s| The begining of the Sideboard section of the deck.|
|m| The begining of the Maybeboard section of the deck.|

Wrapper characters
There are also special wrapped values that can be optionally included in the decklist to mantain values mostly used in Archideckt. These values are wrapped in special characters to allow them to be included in the HXDEC string without interfering with the parsing of the card codes and sections. It should be noted that choosing to include these can significantly lengthen an otherwise compact list.

To include a Deck Name use the "+" symbol to wrap the name, and include at the end of the decklist. You may chose to URL encode your deck name.

"Deck Name" is used primarily in Arena format.

These include:


| Symbol | Description	| Example | 
| :-------- | :------- | :------- | 
| \*…* |	Foil information |	\*F* |
|^…^	|Tags|	^Buy,#0066ff^|
|[…]	|Categories|	[Draw, Burn]|
|\~…~	|Text-based collector numbers|	\~TMP-315~|
|+…+	|Deck Name|	+My%20Deck+|

Any text that is wrapped in these symbols won't affect the formatting of |the rest of the list. For example, an "s" inside your [spell slinger] Archideckt category won't trigger the start of a sideboard section.
## Authors

- [@runeform](https://www.github.com/runeform)


## Support

For support, email contactedhpowerlevel@gmail.com 

