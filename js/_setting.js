var settings = {
    ignoreDataProperties: [
        "menu",
        "keycolor",
        "animation", 
        "rules",
        "image",
        "audio",
        "keycolor",
        "type",
        "pagesToAdd",
        "tabType",
        "layout",
        "imagein",
        "poster",
        "src",
        "svg", 
        "fallbackImg",
        "style"
    ],        
    ignoreTypes: [
        "boolean", 
        "number"
    ],
    unwantedCharacters:
    [
        {
            expresion: '&nbsp;', 
            newCharacter: ' '
        },
        {
            expresion: '\\n', 
            newCharacter: ' '
        },
    ],
    tags: [
        {
            start: "<span",
            end: "</span>",
        },
        {
            start: "<img",
            end: " />",
        }
    ],
    checkhtml: [/<\p>/g, /<\h\d>/g]
}