BIMROCKET.IOService = class extends BIMROCKET.Service
{
  static type = "io";
  static SERVICE_TYPES =
    [["WebdavService", "Webdav service"], 
     ["ComponentService", "Component service"]];
  
  constructor(name, description = null, 
    url = null, username = null, password = null)
  {
    super(name, description, url, username, password);
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

  download(path, options, readyCallback, progressCallback)
  {
    readyCallback(new BIMROCKET.IOResult(BIMROCKET.IOResult.ERROR,
      "Not implemented."));
  }

  upload(data, path, options, readyCallback, progressCallback)
  {
    readyCallback(new BIMROCKET.IOResult(BIMROCKET.IOResult.ERROR,
      "Not implemented."));
  }
  
  remove(path, readyCallback, progressCallback)
  {
    readyCallback(new BIMROCKET.IOResult(BIMROCKET.IOResult.ERROR,
      "Not implemented."));
  }

  makeCollection(path, readyCallback, progressCallback)
  {
    readyCallback(new BIMROCKET.IOResult(BIMROCKET.IOResult.ERROR,
      "Not implemented."));
  }
};

BIMROCKET.IOResult = class
{
  static OK = 0;
  static ERROR = 1;
  
  constructor(status, message, path, metadata, entries, object, data)
  {
    this.status = status;
    this.message = message;
    this.path = path;
    this.metadata = metadata;
    this.entries = entries; // IOMetadata
    this.object = object; // Object3D
    this.data = data; // object data
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