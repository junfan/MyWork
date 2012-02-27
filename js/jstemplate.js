var JsTemplate = function() {

    var reg=/\{([\d\w\.]+|@idx([\+-]\d+)?)\}/g

    var regSec=/\{([#^])([\d\w]+)\}(.*?)\{\/\2\}/g

    var idxField=/@idx([\+-]\d+)?/;

    function _JsTemplate(tpl) {
        if(tpl){
            this._tplobj = MatchField(tpl);
        }
    }

    _JsTemplate.prototype.render = function(obj) {
        return render(this._tplobj, obj);
    }

    _JsTemplate.prototype.getSection=function(name){
        var childNode=this._tplobj.child;
        var childJsTpl;
        if(!childNode){
            return null;
        }
        for(var i=0;i<childNode.length;i++){
            if(childNode[i].type=="section" && childNode[i].inverse!="^"){
                childJsTpl=new _JsTemplate();
                childJsTpl._tplobj=childNode[i];
                return childJsTpl;
            }
        }
        return null;
    }

    function MatchField(tpl, name, inverse) {

        regSec.lastIndex = 0;

        var obj = {
            type: "section",
            name: name,
            inverse: inverse
        };

        var child = [];

        var lastIndex = 0;

        var submatch, match;

        while (match = regSec.exec(tpl)) {
            if (match.index > lastIndex) {
                var subtpl = tpl.substr(lastIndex, match.index - lastIndex)
                SubMatch(subtpl, child);
            }

            lastIndex = regSec.lastIndex;
            child.push(MatchField(match[3], match[2], match[1]));
            //恢复lastIndex
            regSec.lastIndex = lastIndex;
        }

        if (tpl.length - lastIndex > 0) {
            SubMatch(tpl.substr(lastIndex, tpl.length - lastIndex), child)
        }

        obj.child = child;

        return obj;
    }

    function SubMatch(subtpl, parent) {

        reg.lastIndex = 0;

        var submatch;

        lastIndex = 0;

        while (submatch = reg.exec(subtpl)) {
            if (submatch.index > lastIndex) {
                parent.push({
                    type: "string",
                    data: subtpl.substr(lastIndex, submatch.index - lastIndex)
                })
            }
            lastIndex = reg.lastIndex;

            parent.push({
                type: "field",
                name: submatch[1]
            });
        }
        if (subtpl.length - lastIndex > 0) {
            parent.push({
                type: "string",
                data: subtpl.substr(lastIndex, subtpl.length - lastIndex)
            })
        }
    }

    function isArray(subvalue){
        return Object.prototype.toString.apply(subvalue).toLowerCase() === "[object array]"
    }

    function isObject(subvalue){
        return Object.prototype.toString.apply(subvalue).toLowerCase() === "[object object]"
    }

    function map(array, fn) {
        var data = [];
        for (var i = 0, len = array.length; i < len; i++) {
            data[i] = fn(array[i], i);
        }
        return data;
    }

    function render(tplObj, value,index) {
        value = value || {}
        var result = [],
            tpl = tplObj.child,
            tpltype, bInverse, subvalue,idxMatch;

        for (var i = 0, len = tpl.length; i < len; i++) {
            tpltype = tpl[i].type
            subvalue = value[tpl[i].name]
            if (tpltype == "string") {
                result[i] = tpl[i].data;
            } else if (tpltype == "section") {
                bInverse = (tpl[i].inverse === "^");
                if (bInverse) {
                    if (!subvalue || (isArray(subvalue) && subvalue.length==0)) {
                        result[i] = render(tpl[i]);
                    } else {
                        result[i] = "";
                    }
                } else {
                    if (!subvalue || (isArray(subvalue) && subvalue.length==0)) {
                        result[i] = "";
                    } 
                    else if (isArray(subvalue)) {
                        result[i] = map(subvalue, function(v, index) {
                            return render(tpl[i], v, index);
                        }).join("");
                    }
                    else{
                        result[i] = render(tpl[i], value[tpl[i].name]);
                    }
                }
            } else if (tpltype == "field") {

                idxMatch=idxField.exec(tpl[i].name);

                if (tpl[i].name === ".") {
                    result[i] = value;
                } 
                else if(idxMatch){
                    index=parseInt(index,10);
                    if(isNaN(index)){
                        result[i]="{"+idxMatch[0]+"}";
                    }
                    else{
                        result[i] =index-(idxMatch[1]?(-idxMatch[1]):0)
                    }
                }
                else if (typeof subvalue === "undefined" || subvalue === null) {
                    result[i] = "{" + tpl[i].name + "}";
                } else {
                    result[i] = subvalue;
                }
                //result[i]= (typeof value[tpl[i].name] === "undefined" || value[tpl[i].name]===null) ? ("{"+tpl[i].name+"}") : value[tpl[i].name];
            }
        }
        return result.join("");
    }
    return _JsTemplate;
}();

function JsTemplateTest() {

    function assert(tpl, data, result) {
        var obj = new JsTemplate(tpl);
        var iRet = (result == obj.render(data))
        if (!iRet) {
            console.log(obj.render(data));
        }
        return iRet;
    }

    function testSection() {
        var cases = [
            ["hello{#sec}123{/sec}",
            {}, "hello"],
            ["hello{#sec}123{/sec}",
            {
                "a": 1
            }, "hello"],
            ["hello{#sec}123{/sec}",
            {
                "sec": 1
            }, "hello123"],
            ["hello{#sec}123{/sec}",
            {
                "sec": 0
            }, "hello"],
            ["hello{#sec}123{/sec}",
            {
                "sec": []
            }, "hello"],
            ["hello{#sec}123{/sec}",
            {
                "sec": null
            }, "hello"],
            ["hello{#sec}123{/sec}",
            {
                "sec": undefined
            }, "hello"],
            ["hello{#sec}123{/sec}",
            {
                "sec": false
            }, "hello"],
            ["{#sec}123{/sec}hello",
            {}, "hello"],
            ["hello{#sec}123{/sec}hello",
            {}, "hellohello"],
            ["hello{#sec}abc{a}{/sec}",
            {
                "sec": {
                    a: 1
                }
            }, "helloabc1"],
            ["hello{#sec}abc{a}{/sec}",
            {
                "sec": {}
            }, "helloabc{a}"],
            ["hello{#sec}abc{a}{/sec}",
            {
                "sec": [{}]
            }, "helloabc{a}"],
            ["hello{#sec}abc{a}{/sec}",
            {
                "sec": [{}, {}]
            }, "helloabc{a}abc{a}"],
            ["hello{#sec}abc{a}{/sec}",
            {
                "sec": [{
                    b: 1
                }, {}]
            }, "helloabc{a}abc{a}"],
            ["hello{#sec}abc{.}{/sec}",
            {
                "sec": [1, 2]
            }, "helloabc1abc2"],
            ["hello{#sec}abc{@idx}{/sec}",
            {
                "sec": [1, 2]
            }, "helloabc0abc1"],
            ["hello{#sec}abc{@idx+1}{/sec}",
            {
                "sec": [1, 2]
            }, "helloabc1abc2"]
        ]
        for (var i = 0, len = cases.length; i < len; i++) {
            if (!assert.apply(null, cases[i])) {
                console.log("Case " + i + " Failed:" + cases[i]);
            } else {
                console.log("Case " + i + "Passed:" + cases[i]);
            }
        }
    }

    function testField() {
        var cases = [
            ["hello{sec}",
            {}, "hello{sec}"],
            ["hello{1}", ["yes"], "helloyes"],
            ["hello{sec}",
            {
                sec: null
            }, "hello{sec}"],
            ["hello{sec}",
            {
                sec: 0
            }, "hello0"],
            ["hello{sec}",
            {
                sec: undefined
            }, "hello{sec}"],
            ["hello{sec}",
            {
                sec: "abc"
            }, "helloabc"],
            ["hello{.}", "abc", "helloabc"],
            ["hello{.}{efg}", "abc", "helloabc{efg}"],
            ["hello{.}{efg}{@idx+1}", "abc", "helloabc{efg}{@idx+1}"],
            ["hello{sec}efg",
            {
                sec: "abc"
            }, "helloabcefg"],
            ["hello{#sec}<sec count='{count}'>{#subsec}<subsec>this is subsec {@idx+1} value is {.}</subsec>{/subsec}</sec>{/sec}",
            {
                sec: {
                    count: 3,
                    subsec: ["brooks", "fan"]
                }
            }, "hello<sec count='3'><subsec>this is subsec 1 value is brooks</subsec><subsec>this is subsec 2 value is fan</subsec></sec>"]
        ];


        for (var i = 0, len = cases.length; i < len; i++) {
            if (!assert.apply(null, cases[i])) {
                console.log("Case " + i + " Failed:" + cases[i]);
            } else {
                console.log("Case " + i + "Passed:" + cases[i]);
            }
        }
    }

    function testGetSection() {
        var tpl = "abc{#efg}hello {firstName},{secondName}!{/efg}efg";
        var tplObj = new JsTemplate(tpl);
        console.log(tplObj.getSection("efg").render({
            firstName: "brooks",
            secondName: "fan"
        }))
    }


    function testInverse() {

        var cases = [
            ["{#row}{cell}{/row}{^row}no rows{/row}",
            {
                row: [{
                    cell: "hello"
                }]
            }, "hello"],
            ["{#row}{cell}{/row}{^row}no rows{/row}",
            {}, "no rows"],
            ["{#row}{cell}{/row}{^row}no rows{/row}", undefined, "no rows"]
        ];


        for (var i = 0, len = cases.length; i < len; i++) {
            if (!assert.apply(null, cases[i])) {
                console.log("Case " + i + " Failed:" + cases[i]);
            } else {
                console.log("Case " + i + "Passed:" + cases[i]);
            }
        }
    }

    function testAll() {
        testSection();
        testField();
        testInverse();
        testGetSection();
    }

    testAll()
}
