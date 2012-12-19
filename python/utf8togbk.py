#coding:utf-8
import sys
import os

def utf8togbk(fileName,data):
    data=data.decode('utf-8')
    result="";
    for i in xrange(len(data)):
        try:
            c=data[i].encode('gbk')
            result=result+c
        except:
            uchex=data[i].encode('utf_16_be').encode('hex')
            print "cant't encode \u%s in %d"%(uchex,i)
            if uchex.startWith("00"):
                result=result+"?"
            else:
                result=result+"??"

    f=open(fileName,"w")
    f.write(result)
    f.close()

buildOptions=[
        ["convert <file>",u"把file转换UTF8格式"],
        ["batchconvert <suffix>",u"把当前目录以及子目录的为suffix的后缀的文件换位UTF8"]
];

def help():
    print "usage:\t%s <cmd>"%sys.argv[0]
    print u"cmd:"
    printOptions()

def printOptions():
    for item in buildOptions:
        print " %s %s"%(item[0].ljust(30),item[1])


def isUTF8File(data):
    return isUTF8Bom(data[:3]) or isUTF8Text(data)


def isUTF8Bom(text):
    bom="EFBBBF".decode('hex')
    return text.startswith(bom)


def toOrd(hex):
    return ord(hex.decode('hex')[0])

def is2ByteHead(x):
    """
        110X XXXX 
        10XX XXXX
    """
    o=toOrd("E0")
    x=ord(x)
    return  (x & o) == toOrd("C0")

def is3ByteHead(x):
    """
    1110 XXXX 
    10XX XXXX 
    10XX XXXX
    """
    o=toOrd("F0")
    x=ord(x)
    return  (x & o) == toOrd("E0")

def isFollowByte(x):
    o=toOrd("C0")
    x=ord(x)
    return  (x & o) == toOrd("80")

def allIsFollowByte(x):
    for i in x:
        if not isFollowByte(i):
            return False
    return True
        
def isUTF8Text(text):
    nocount=0
    count=0
    for i in xrange(len(text)):
        if is2ByteHead(text[i]):
            if not allIsFollowByte(text[i+1:i+2]):
                nocount+=1
            else:
                count+=1

        elif is3ByteHead(text[i]):
            if not allIsFollowByte(text[i+1:i+3]):
                nocount+=1
            else:
                count+=1

    return count>0 and nocount==0

def getFileData(fileName):
    f=open(fileName,"r")
    data=f.read()
    f.close()
    return data

def convertToUtf8(fileName):
    data=getFileData(fileName)
    if isUTF8File(data):
        utf8togbk(fileName,data)

def getAllFilesInDir(dirname):
    gen=os.walk(dirname)
    allFile=[]
    try:
        while True:
            data=gen.next()
            files=map(lambda x:data[0]+"\\"+x,data[2])
            allFile.extend(files)
    except:
        pass
    return allFile


def batchconvert(suffix):
    print os.getcwd()
    files=getAllFilesInDir(os.getcwd())
    files=[filename for filename in files if filename.endswith(suffix)]

    #print files
    for filename in files:
        print filename
        convertToUtf8(filename)


def main():
    if len(sys.argv)<3:
        help()
        return
    else:
        #utf8togbk(sys.argv[1])
        if sys.argv[1]=="convert":
            convertToUtf8(sys.argv[2])
        elif sys.argv[1]=="batchconvert":
            batchconvert(sys.argv[2])
        else:
            help()

if __name__=="__main__":
    main()

