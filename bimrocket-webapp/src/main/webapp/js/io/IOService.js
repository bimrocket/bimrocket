/**
 * IOService.js
 *
 * @author realor
 */

import { Service } from "./Service.js";

class IOService extends Service
{
  static type = "io";

  constructor(name, description = null,
    url = null, username = null, password = null)
  {
    super(name, description, url, username, password);
  }

  open(path, options, readyCallback, progressCallback)
  {
    readyCallback(new IOResult(IOResult.ERROR, "Not implemented."));
  }

  save(object, path, options, readyCallback, progressCallback)
  {
    readyCallback(new IOResult(IOResult.ERROR, "Not implemented."));
  }

  download(path, options, readyCallback, progressCallback)
  {
    readyCallback(new IOResult(IOResult.ERROR, "Not implemented."));
  }

  upload(data, path, options, readyCallback, progressCallback)
  {
    readyCallback(new IOResult(IOResult.ERROR, "Not implemented."));
  }

  remove(path, readyCallback, progressCallback)
  {
    readyCallback(new IOResult(IOResult.ERROR, "Not implemented."));
  }

  makeCollection(path, readyCallback, progressCallback)
  {
    readyCallback(new IOResult(IOResult.ERROR, "Not implemented."));
  }
}

class IOResult
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
}

class IOMetadata
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
}

export {IOService, IOResult, IOMetadata };