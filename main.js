// ================ MODEL ================
// 'private' propertes
// cacheDom
// bindEvents
// render
// 'private' functions
// accessible functions from outside

// ================ PubSub ================
var PubSub = {
    lists: {},
    subscribe: function(listName, fn){
        this.lists[listName] = this.lists[listName] || [];
        this.lists[listName].push(fn);
    },
    unscubscribe: function(listName, fn){
        if(this.lists[listName]){
            for(var i = 0; i < this.lists[listName].length; i++){
               if(this.lists[listName][i] === fn){
                   this.lists[listName].split(i, 1);
                   break
               } 
            }
        }
    },
    publish: function(listName, data){
        if (this.lists[listName]) {
            this.lists[listName].forEach(function(fn){
                fn(data)
            })
        }
    }
}


// ================ navigation ================
var navigation = (function (){
    var $el = $(".nav_bar");
    var $input = $el.find("input")[0];
    var $upload = $el.find("#load");
    var $download = $el.find("#download");
    var $export = $el.find("#export");
    var finalJSON = {};
    var dataForTranslation = {};

    //bind events
    $upload.on("click", uploadFile);
    $download.on("click", downloadJsonFile);
    $export.on("click", exportDocFile);

    //subscribers
    PubSub.subscribe("dataForJson", getFinalJSON)
    PubSub.subscribe("dataForDocx", getDataForTranslation)

    //all navigation functions...
    function getFinalJSON (thisData){
        finalJSON = thisData;
    }

    function getDataForTranslation (thisData){
        dataForTranslation = thisData
    }

    function uploadFile(){
        var file = $input.files[0];
        var fReader;

        if (!file) {
            alert("Please select a file before clicking 'Load'");
        }
        else {
            fReader = new FileReader();
            fReader.onload = takeFile;
            fReader.readAsText(file);
        }

        function takeFile(event) {
            var oldContent = JSON.parse(event.target.result);
            PubSub.publish("oldFile", oldContent)
        }
    }

    function downloadJsonFile(){
        var dataStr = "data:text/json;charset=utf-8," + JSON.stringify(finalJSON);
        var fileName =  "newfile_EN.json";
        var dlAnchorElem = document.getElementById('downloadAnchorElem');
        dlAnchorElem.setAttribute("href",     dataStr );
        dlAnchorElem.setAttribute("download", fileName);
        dlAnchorElem.click();
    }

    function exportDocFile (){
        function loadFile(url,callback){
            JSZipUtils.getBinaryContent(url,callback);
        }
        loadFile("docx_templates/loop_table.docx",function(error,docX){
            if (error) { throw error };
            var zip = new JSZip(docX);  //get zip file as ArrayBuffer/String
            var doc = new Docxtemplater()
            doc.loadZip(zip)
            doc.setData({"object": dataForTranslation});
            // console.log(doc.setData({"object": dataForTranslation}).data) // doc.setData({"object": dataForTranslation}).data
            // var htmlModule = new myHtmlModule({})
            // doc.attachModule(myHtmlModule);
            try {
                // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
                doc.render()
            }
            catch (error) {
                var e = {
                    message: error.message,
                    name: error.name,
                    stack: error.stack,
                    properties: error.properties,
                }
                console.log(JSON.stringify({error: e}));
                // The error thrown here contains additional information when logged with JSON.stringify (it contains a property object).
                throw error;
            }
    
            var output = doc.getZip().generate({
                type:"blob",
                mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            }) //Output the document using Data-URI
            saveAs(output,"output.docx")
        })        
    }
})()

// ================ fileWorker ================
var fileWorker = (function(){
    var $contentBox = $(".main-content")
    var $navBar = $(".nav_bar")
    var $templateRoom = $contentBox.find(".templateRoom")[0]
    var $textEditor = $navBar.find(".text-editor-box")
    var $body = $("body")
    var dataDepo = ko.observableArray([])
    var finalJSON = {}
    var textEditor = new textEditorConstructor()
    var filter = new filterConstructor()

    // bind events
    var knockoutBindings = (function(){
        this.vm1 = new render()
        this.vm2 = new bindReferences()
    })()
    ko.applyBindings(knockoutBindings, $templateRoom);

    //subscribers
    PubSub.subscribe("oldFile", startWork)

    //all fileWorker functions...
    function render(){
        self.renderContent = dataDepo
    }

    function bindReferences(){
        self.toggleReferences = function(data, event){
            var $domElem = $(event.target).parents(".box");
            if($domElem.hasClass("clicked"))    $domElem.removeClass("clicked")
            else                                $domElem.addClass("clicked")
        }
    }

    function startWork(oldData){
        if (_.isEmpty(oldData)){
            alert("ERROR: file is empty")
        }else {
            spinData(oldData)
            highlightingReferences()
            reSizeTextArea()
            textEditor.watchTextareas()
        }
    }

    function spinData(oldData) {
        // Clean dataDepo, Coppy JSON structure, start data looping
        dataDepo([])
        finalJSON = oldData;
        LoopObject("", oldData);
        
        function LoopObject (key, objToLoop){
            for (var property in objToLoop) {
                if (objToLoop.hasOwnProperty(property)) {
                    var nestedObject = objToLoop[property];
                    var referance = key + "." + property;
                    if (skip(property) === false){
                        LoopContinuation (referance, nestedObject)
                    }
                }
            }
        }

        function LoopContinuation (referance, currentObj){
            if(typeof currentObj === 'string'){
                if(!ignoreThis(currentObj) && !skip(currentObj) && !itsEmpty(currentObj)){
                    var newObject = {};
                    var filterObj = filter.pullOutIcons(currentObj)
                    newObject.key = ko.observable(referance);
                    newObject.value = ko.observable(filterObj);
                    newObject.orginal = filterObj
                    dataDepo.push(newObject);
                }
            }
            else if(typeof currentObj !== 'string' && Array.isArray(currentObj) === true){
                LoopArrey(referance, currentObj);
            }
            else if(typeof currentObj !== 'string' && Array.isArray(currentObj) === false){
                LoopObject(referance, currentObj);
            }
        }         

        function LoopArrey(key, nestedArrey){
            if (nestedArrey.length === 1){
                var loverLvl = nestedArrey[0];
                var referance = key + "[0]";
                LoopContinuation (referance, loverLvl)
            }
            else {
                for(var i = 0; i < nestedArrey.length - 1; i++){
                    var loverLvl = nestedArrey[i];
                    var referance = key + "[" + i + "]";
                    LoopContinuation (referance, loverLvl)
                }
            }
        }       

        function ignoreThis(Obj){
            var status = false
            settings.ignoreTypes.forEach(function (typeToIgnor){
                if(typeof Obj === typeToIgnor){
                    status = true
                }
            })
            return status
        }

        function skip(propertyName){
            var status = false
            settings.ignoreDataProperties.forEach(function (propToIgnor){
                if(propertyName === propToIgnor){
                    status = true
                }
            })        
            return status
        }

        function itsEmpty(thisObj){
            if(thisObj === ""){
                return true
            }else{
                return false
            }
        }
    }
    
    function highlightingReferences() {
        jQuery.each(jQuery('.box'), function(index, element) {
            var heyFromElem = $(element).find(".left").find("p").text()
    
            if (heyFromElem.indexOf("ref") !== -1){
                $(element).css("background-color", "#c4c3ff")
                $(element).find(".right").find("textarea").remove()
            }
        })
    }

    function reSizeTextArea(){
        _.each($('textarea'), function(element) {
            var offset = element.offsetHeight - element.clientHeight;
            var resizeArea = function(el) {
                $(el).css('height', 'auto').css('height', el.scrollHeight);
            };
            $(element).on('click keyup input', function() { resizeArea(this); }).removeAttr('data-autoresize');
        });
    }
    
    function textEditorConstructor(){
        var $target

        this.watchTextareas = function(){
            var $textArea =  $contentBox.find("textarea")
            $textArea.focus(function(event){
                $target = event.target
                tinyMCE.activeEditor.setContent($target.value);
            })  

            $textArea.on('blur', function(event){
                $target = event.target
                tinyMCE.activeEditor.setContent($target.value);
            })

            $textArea.on('change', function() {
                saveWork()
            });
        }

        tinyMCE.init({
            selector: '#text_editor',
            skin: 'lightgray',
            plugins : 'advlist autolink link image lists charmap print preview hr anchor pagebreak spellchecker searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking save table contextmenu directionality emoticons template paste textcolor',
            toolbar: 'bold | italic | underline | strikethrough | alignleft | aligncenter | alignright | alignjustify | styleselect | bullist | numlist | outdent | indent | blockquote | removeformat | subscript | superscript',
            menubar: false,
            plugins: "paste",
            paste_data_images: false,
            setup: function (editor) {
                editor.on('change', function () {
                    editor.save();
                    if($target){
                        $target.value = editor.getContent()
                        $($target).trigger("change")
                    }
                });
            }
          });
    }

    function filterConstructor (){
        var tagsStorage = [];

        function tagExist(parameter1, parameter2){
            return parameter1 !== -1 || parameter2 !== -1
        }
        function catchError(content, parameter1, parameter2){
            if(parameter1 !== -1 && parameter2 === -1){
                alert("Filter error ocures. Check console log");
                throw "Start or end of tag doesn't mutch in this contnet: " + "\n" + content;
            }                
        }
        function storeTag(content, parameter1, parameter2){
            var extractedTag = content.substring(parameter1, parameter2);
            tagsStorage.push(extractedTag)
        }
        function rebuildContent(orginalString, parameter1, parameter2){
            var part1 = orginalString.substring(0, parameter1);
            var part2 = "[iconIsHere_" + getIndicatorNum()  + "]";
            var part3 = orginalString.substring(parameter2);
            var newString = part1.concat(part2).concat(part3);
            return newString;
        }
        function getIndicatorNum(){
            var iNum = tagsStorage.length - 1;
            switch (true){
                case (iNum < 10):
                    iNum = "0" + iNum
                    break
                case  (iNum < 100):
                    iNum = iNum
                    break
            }
            return iNum
        }
        this.pullOutIcons = function(injectedString){
            var newContent = injectedString;

            (function matchTagPatterns(){
                var tag_start, tag_end, tag_offset;
                for(i=0; i < settings.tags.length; i++){
                    tag_start = settings.tags[i].start
                    tag_end = settings.tags[i].end
                    tag_offset = settings.tags[i].end.length
                    searchInString()
                }
                function searchInString(){
                    var tag_start_index = newContent.indexOf(tag_start);
                    var tag_end_position = newContent.indexOf(tag_end);
                    var tag_end_index = Number(tag_end_position) + Number(tag_offset);
                    
                    if(tagExist(tag_start_index, tag_end_position)){
                        catchError(newContent, tag_start_index, tag_end_position)
                        storeTag(newContent, tag_start_index, tag_end_index)
                        newContent = rebuildContent(newContent, tag_start_index, tag_end_index)
                        searchInString() //look for further tags
                    }
                }
            })()
            return newContent
        }
        this.getBackIcons = function(injectedString){
            var newContent = injectedString;
            if(tagsStorage.length > 0){
                matchIndicators()
            }
            function matchIndicators(){
                var indicatorPatern = "[iconIsHere_";   //regex:  /\[indicator_\d*\]/g
                var indicatorLength = 15;
                var indicator_start_index = newContent.indexOf(indicatorPatern);
                var indicator_end_index = Number(indicator_start_index) + Number(indicatorLength);
                
                if(indicator_start_index !== -1){
                    replaceIndicatorForTag(indicator_start_index, indicator_end_index)
                }
            }
            function replaceIndicatorForTag(parameter1,parameter2){
                var part1 = newContent.substring(0, parameter1);
                var part2 = getBackATag()
                var part3 = newContent.substring(parameter2);
                newContent = part1.concat(part2).concat(part3);
                matchIndicators() //look for further indicators

                function getBackATag(){
                    var tagNum = newContent.substring(parameter1, parameter2).replace(/\[/m, "").replace(/\]/m, "").split("\_")[1];
                    var tagIndex = tagNum.replace(/^0/m, "")
                    return tagsStorage[tagIndex]
                }
            }
            return newContent
        }
        this.removeUnwantedHtmlTags = function(orginalString, injectedString){
            var newContent = injectedString;

            function shouldIRemoveHtmlTags(){
                var removehtmltags = true;
                for(i=0; i < settings.checkhtml.length; i++){
                    if(orginalString.search(settings.checkhtml[i]) >= 0){
                        removehtmltags = false;
                    }
                }
                return removehtmltags;
            }

            if(shouldIRemoveHtmlTags()){
                newContent = newContent.replace(/(<\p>)/g, "").replace(/(<\/\p>)/g, "")
                newContent = newContent.replace(/(<\h\d>)/g, "").replace(/(<\/\h\d>)/g, "")
            }
            return newContent
        }
        this.replaceUnwantedCharacters = function(injectedString){
            var newContent = injectedString;
            for(i=0; i<settings.unwantedCharacters.length; i++){
                var character = settings.unwantedCharacters[i];
                var regexpObject = new RegExp(character.expresion,"g");
                newContent = newContent.replace(regexpObject, character.newCharacter)
            }
            return newContent;
        }
    }

    function saveWork(){
        dataDepo().forEach(function(object){
            var ref_key = object.key().substring(1).replace(/\./g, " ").replace(/\]/g, "").replace(/\[/g, " ").split(" ")
            var stringCheckout = filter.removeUnwantedHtmlTags(object.orginal, object.value())
            var textCheckout = filter.replaceUnwantedCharacters(stringCheckout)
            var iconCheckout = filter.getBackIcons(textCheckout)
            var newValue = iconCheckout
            
            find_property(finalJSON)
            
            var iteration = 0
            function find_property(objToLoop){
                for(var property in objToLoop){
                    if(property == ref_key[iteration]){
                        if(iteration == ref_key.length - 1){
                            objToLoop[property] = newValue;
                        }
                        else{
                            iteration ++;
                            find_property(objToLoop[property]);
                        }
                    }
                }
            }
        })
        PubSub.publish("dataForJson", finalJSON)
        PubSub.publish("dataForDocx", ko.toJS(dataDepo()))
    }
})()
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