BIMROCKET.WebdavService = function (name, description, url, username, password)
{
  BIMROCKET.IOService.call(this, name, description, url, username, password);
};

BIMROCKET.WebdavService.prototype = Object.create(BIMROCKET.IOService.prototype);

BIMROCKET.WebdavService.prototype.open = function (path, options,
  readyCallback, progressCallback)
{
  var OK = BIMROCKET.IOResult.OK;
  var ERROR = BIMROCKET.IOResult.ERROR;
  var COLLECTION = BIMROCKET.IOMetadata.COLLECTION;
  var OBJECT = BIMROCKET.IOMetadata.OBJECT;

  var url = this.url + path;
  console.info(url);

  var baseUri = url;
  var index = baseUri.indexOf("://");
  if (index !== -1)
  {
    baseUri = baseUri.substring(index + 3);
    index = baseUri.indexOf("/");
    if (index !== -1)
    {
      baseUri = baseUri.substring(index);
      if (baseUri.lastIndexOf("/") !== baseUri.length - 1)
      {
        baseUri += "/";
      }
    }
  }

  // **** HTTP PROPFIND REQUEST ****

  var metadata;
  var request = new XMLHttpRequest();
  request.onreadystatechange = function()
  {
    if (request.readyState === 4)
    {
      if (request.status === 0 ||
        request.status === 200 || request.status === 207)
      {
        // OK
        var xml = request.responseXML;
        var multiNode = xml.childNodes[0];
        var responseNodes = multiNode.childNodes;
        metadata = new BIMROCKET.IOMetadata();
        var entries = [];
        for (var i = 0; i < responseNodes.length; i++)
        {
          var responseNode = responseNodes[i];
          if (responseNode.localName === "response")
          {
            var hrefNode = responseNode.querySelector("href");
            var hrefValue = hrefNode.textContent;
            var fileName = hrefValue.substring(baseUri.length);
            var isCollectionNode = responseNode.querySelector(
              "propstat prop resourcetype collection") !== null;
            if (fileName.length === 0) // requested resource
            {
              index = hrefValue.lastIndexOf("/");
              metadata.name = hrefValue.substring(index + 1);
              metadata.description = metadata.name;
              metadata.type = isCollectionNode ? COLLECTION : OBJECT;
            }
            else
            {
              var entry = new BIMROCKET.IOMetadata(fileName, fileName,
                isCollectionNode ? COLLECTION : OBJECT);
              entries.push(entry);
            }
          }
        }
        if (metadata.type === COLLECTION)
        {
          readyCallback(new BIMROCKET.IOResult(OK, "", path, metadata, entries, null));
        }
        else
        {
          // read OBJECT
          var intent = 
          {
            url : url,
            onCompleted : function(object)
            {
              readyCallback(new BIMROCKET.IOResult(OK, "", path, 
                metadata, null, object));
            },
            onProgress : progressCallback,
            onError : function(message)
            {
              readyCallback(new BIMROCKET.IOResult(ERROR, message));
            },
            options : options
          };
          BIMROCKET.IOManager.load(intent);
        }
      }
      else
      {
        // ERROR
        readyCallback(new BIMROCKET.IOResult(ERROR, 
          request.statusText + " (" + request.status + ")"));
      }
    }
  };
  request.open("PROPFIND", url, true);
  request.setRequestHeader("depth", 1);
  request.send();
};

BIMROCKET.WebdavService.prototype.save = function(object, path, options,
  readyCallback, progressCallback)
{
  var OK = BIMROCKET.IOResult.OK;
  var ERROR = BIMROCKET.IOResult.ERROR;

  var url = this.url + path;
  var request = new XMLHttpRequest();

  request.onreadystatechange = function()
  {
    if (request.readyState === 4)
    {
      if (request.status === 0 || request.status === 200)
      {
        readyCallback(new BIMROCKET.IOResult(OK));
      }
      else
      {
        readyCallback(new BIMROCKET.IOResult(ERROR, 
          request.statusText + " (" + request.status + ")"));
      }
    }
  };
  var intent = 
  {
    name : path,
    object : object,
    onCompleted : function(data)
    {
      request.open("PUT", url, true);
      request.send(data);
    },
    onProgress : progressCallback,
    onError : function(message)
    {
      readyCallback(new BIMROCKET.IOResult(ERROR, message));
    },
    options : options
  };
  BIMROCKET.IOManager.export(intent);
};
