
[![HXDEC](http://edhpowerlevel.com/images/hxdec_logo.svg)](https://edhpowerlevel.com/hxdec/)


# HXDEC MTG Decklist Tool
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

HXDEC is a "Magic: the Gathering" decklist format. This library is a tool that can be used for encoding and decoding decklist in the HXDEC and other formats.






## Example List
Here is an example of a full commander decklist in HXDEC format:


```http
hu2cefcu08c17u2c4e5u2c1e0u2c1e1u2c4e7u2dc80u277bu2ce116u12be4u2d314bu08c70u2d6fu25c136u0a02bu128ccu247dau1b925u2d3b8u2e38u2d3155u2b8e1u26db6u27710u28811du18432u2a71au2b111du0246u0fe21u21aa6u28817byd2ec112u2c4efu2b8132u15cb4u204109u2a7157u2da3au2dbe3u29a16cw2ec116u2dcau14312u16b41u2d4dfu0ce102y82ec110u2e24au13722u2a73fcu2a7193u0ce12u2c14fu2d655u2a771u2bd3bu21f33u02414u2dbe7u2a738u29a17du2e268u2c1128u2b8162u2c8f3u2c8f9u2e2100u15e115u2bd1a6u2b1eeu158edu0fe30u2d3a0u21814cu083112u29a158u2d412aku25fd0+Budget Elsha Top+
```
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
## Authors

- [@runeform](https://www.github.com/runeform)


## Support

For support, email contactedhpowerlevel@gmail.com 

