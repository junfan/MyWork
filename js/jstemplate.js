
var JsTemplate = function() {

    var reg=/\{([><]?[\d\w\.]+|@idx([\+-]\d+)?)\}/gm

    //var condSec=/\{\?[\d\w\.]+==[\d\w]\}([\d\D]*?)/gm;

    var regSec=/\{([#^])([\d\w]+)\}([\d\D]*?)\{\/\2\}/gm

    var idxField=/@idx([\+-]\d+)?/;



    function _JsTemplate(tpl) {
        if(tpl){
            this._tplobj = MatchField(tpl);
        }
    }

    /**
     * obj是一个对象
     */
    _JsTemplate.prototype.render = function(obj) {
        return render(this._tplobj, obj);
    }

	/**
	 * 获取子对象
	 */
    _JsTemplate.prototype.getSection=function(name){
        var childNode=this._tplobj.child;
        var childJsTpl;
        if(!childNode){
            return null;
        }
        for(var i=0;i<childNode.length;i++){
            if(childNode[i].type=="section" && childNode[i].inverse!="^" &&childNode[i].name==name){
                childJsTpl=new _JsTemplate();
                childJsTpl._tplobj=childNode[i];
                return childJsTpl;
            }
        }
        return null;
    }


	/**
	 * 分析单纯的属性
	 */
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

	/**
	 * 分析属性的实现
	 */
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
    var escapeMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;'
    };

    function escapeHTML(string) {
        return String(string).replace(/&(?!\w+;)|[<>"']/g, function (s) {
            return escapeMap[s] || s;
        });
    }

    function getValue(tplname,value){
        if(tplname.charAt(0)==">"){
            return value;
        }
        else if(tplname.charAt(0)=="<"){
            return unescape(value);
        }
        return escapeHTML(value);
    }

	function nullOrUndef(value){
		return value===null || typeof subvalue === "undefined";
	}

    function render(tplObj, value,index) {
        value = value || {}
        var result = [],
            tpl = tplObj.child,
            tpltype, bInverse, subvalue,idxMatch,fieldName,tplname;

        for (var i = 0, len = tpl.length; i < len; i++) {
            tpltype = tpl[i].type
            tplname= tpl[i].name;
            if (tpltype == "string") {
                result[i] = tpl[i].data;
            } else if (tpltype == "section") {
                bInverse = (tpl[i].inverse === "^");
                //如果没有名字，那么就是顶层的值
                subvalue = value[tplname];
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
                        result[i] = render(tpl[i], value[tplname]);
                    }
                }
            } else if (tpltype == "field") {
                idxMatch=idxField.exec(tplname);
                if(idxMatch){
                    index=parseInt(index,10);
                    if(isNaN(index)){
                        result[i]="{"+idxMatch[0]+"}";
                    }
                    else{
                        result[i] =index-(idxMatch[1]?(-idxMatch[1]):0)
                    }
                }
                else{
                    fieldName=tplname.charAt(0)==">" || tplname.charAt(0)=="<" ? tplname.substr(1) : tplname;
                    subvalue = value[fieldName]
                    if (fieldName === ".") {
                        result[i] = getValue(tplname,value);
                    } 
                    else if (typeof subvalue === "undefined" || subvalue === null) {
                        result[i] = "{" + tplname + "}";
                    } else {
                        result[i] = getValue(tplname,subvalue);
                    }
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

    function testArray() {
        var cases=[
            ["<li>{abc}</li>",[{abc:1},{abc:2}],"<li>1</li><li>2</li>"]
        ];
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
            ["hello{0}", ["yes"], "helloyes"],
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
            }, "hello<sec count='3'><subsec>this is subsec 1 value is brooks</subsec><subsec>this is subsec 2 value is fan</subsec></sec>"],

            ["test{>abc}",{"abc":'<haha'},"test<haha"],
            ["test{abc}",{"abc":'<haha'},"test&lt;haha"]
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
        testArray();
        testInverse();
        testGetSection();
    }

    testAll()
}

/**
 * 开发这个模版引擎主要是之前用过一些不好，比较难使用的模版，
 * 在web前端很多时候我们可能会使用一些innerHTML的方式来构建
 * 一个代码块，一般这种情况都是通过一个数据与一个模版来进行
 * 填充的。这里这种模版的思想主要是受到http://mustache.github.com/
 * 的影响，最大的特点就是无逻辑，无逻辑最大的好处就是逻辑代码
 * 与生成html的代码进行了分离，这样减少了交叉污染，特别不喜欢
 * 看到模版代码里面充斥着各种if else语句，for语句，然后导致
 * 我们需要按照这个模版自己的语法运算一下才能够知道最后生成
 * 出来的东西长什么样。所以我们鼓励的是尽量减少模版中的逻辑
 * 处理，这些处理大可以在数据中处理好，然后直接让模版渲染。
 * 
 * 为什么需要这样？
 *
 * 如果模版中有了太多的逻辑处理的话，我们知道这种代码肯定是很难理解的
 * 也就是模板做了两个事情，一部分包含了数据处理的逻辑，另外一部分就
 * 包含了生成文本的工作。而相对来说，模版适合处理的是生成文本，而处理
 * 数据的逻辑应该放在模版引擎之外，除了小部分通用处理。
 *
 */


	//这是啥
	var regSecTag=/\{([#^\/?])([\d\w\+\-\*\/=\>\<=!?@]+)\}/gm

	//寻找分区标记符，主要是为了解决之前的不能匹配嵌套类型的tag的问题
	//通过使用寻找配对的方式，与括号匹配类似
	//支持如下的区块：
	//{#abc}{/abc} 作为一个section，一定match的是一个对象，会递归使用abc对象
	//{?123=b}{/?} 如果条件为真输出里面的值，不作为区块
	//{^abc}{/abc} 如果没有abc属性，展示里面的值
	//
	function CompileSection(tpl) {
		regSecTag.lastIndex = 0;
		var aTopTags = [];
		var match;
		var aTags = [];
		var tag;
		var parentTag;
		while (match = regSecTag.exec(tpl)) {
			tag = {
				start: match.index,
				tag: match[2],
				flag: match[1],
				end: match[0].length + match.index
			}
			//上一个tag
			lastTag = aTags[aTags.length - 1];
			//结束标志
			if ((tag.tag == "?" && tag.flag == "/" && lastTag.flag == "?") || (tag.flag == "/" && tag.tag != "?" && tag.tag == lastTag.tag)) {
				lastTag.match = tag;
				aTags.pop();
				if (aTags.length == 0) {
					aTopTags.push(lastTag);
				} else {
					parentTag = aTags[aTags.length - 1];
					if (!parentTag.child) {
						parentTag.child = [];
					}
					parentTag.child.push(lastTag);
				}
			} else if (tag.flag != "/") {
				aTags.push(tag);
			} else {
				throw new Error("no match end tag");
			}
		}
		//console.log(aTopTags);
		return aTopTags;
	}

    var regFieldTag=/\{([><=]?)([\d\w\.@]+)([\+\-\*\/\%][\d]+)?\}/gm

	function ComplileField(tpl){
		regFieldTag.lastIndex=0;
	}

	//function CompileTemplate(s){

    function CompileTemplate(tpl, name, inverse) {

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

	function testCompile(){
		var s=" halllo this {?hallo}good{/?} is a tag sec \r\n {#abc} 123 {#abc}good one{/abc}, {?abc=1}haha{/?}\r\n do you want another {^abc} yes {/abc} haha {/abc}"
		console.log(CompileTemplate(s))
	}

	testCompile();
