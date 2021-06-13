BIMROCKET.IOService = class
{
  constructor(name, description, url, username, password)
  {
    this.name = name;
    this.description = description;
    this.url = url;
    this.username = username;
    this.password = password;
  }

  open(path, options, readyCallback, progressCallback)
  {
    readyCallback(new BIMROCKET.IOResult(BIMROCKET.IOResult.ERROR,
      "Not implemented."));
  }

  save(object, path, options, readyCallback, progressCallback)
  {
    readyCallback(new BIMROCKET.IOResult(BIMROCKET.IOResult.ERROR,
      "Not implemented."));
  }
  
  remove(path, readyCallback, progressCallback)
  {
    readyCallback(new BIMROCKET.IOResult(BIMROCKET.IOResult.ERROR,
      "Not implemented."));
  }
};

BIMROCKET.IOResult = class
{
  static OK = 0;
  static ERROR = 1;
  
  constructor(status, message, path, metadata, entries, object)
  {
    this.status = status;
    this.message = message;
    this.path = path;
    this.metadata = metadata;
    this.entries = entries; // IOMetadata
    this.object = object;
  }
};

BIMROCKET.IOMetadata = class
{
  static COLLECTION = 1;
  static OBJECT = 2;

  constructor(name, description, type, size)
  {
    this.name = name;
    this.description = description;
    this.type = type;
    this.size = size;
  }
};