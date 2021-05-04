BIMROCKET.IOService = function(name, description, url, username, password)
{
  this.name = name;
  this.description = description;
  this.url = url;
  this.username = username;
  this.password = password;
};

BIMROCKET.IOService.prototype = 
{
  open : function(path, options, readyCallback, progressCallback)
  {
    readyCallback(new BIMROCKET.IOResult(BIMROCKET.IOResult.ERROR, 
      "Not implemented."));
  },
  
  save : function(object, path, options, readyCallback, progressCallback)
  {
    readyCallback(new BIMROCKET.IOResult(BIMROCKET.IOResult.ERROR,
      "Not implemented."));
  }
};

BIMROCKET.IOResult = function(status, message, path, metadata, entries, object)
{
  this.status = status;
  this.message = message;
  this.path = path;
  this.metadata = metadata;
  this.entries = entries; // IOMetadata
  this.object = object;
};

BIMROCKET.IOMetadata = function(name, description, type, size)
{
  this.name = name;
  this.description = description;
  this.type = type;
  this.size = size;
};

BIMROCKET.IOResult.OK = 0;
BIMROCKET.IOResult.ERROR = 1;

BIMROCKET.IOMetadata.COLLECTION = 1;
BIMROCKET.IOMetadata.OBJECT = 2;
