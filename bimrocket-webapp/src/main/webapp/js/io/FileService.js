/**
 * FileService.js
 *
 * @author realor
 */

import { Service } from "./Service.js";

class FileService extends Service
{
  constructor(parameters)
  {
    super(parameters);
  }

  open(path, readyCallback, progressCallback)
  {
    readyCallback(new Result(Result.ERROR, "Not implemented."));
  }

  save(path, data, readyCallback, progressCallback)
  {
    readyCallback(new Result(Result.ERROR, "Not implemented."));
  }

  remove(path, readyCallback, progressCallback)
  {
    readyCallback(new Result(Result.ERROR, "Not implemented."));
  }

  makeCollection(path, readyCallback, progressCallback)
  {
    readyCallback(new Result(Result.ERROR, "Not implemented."));
  }
}

class Result
{
  static OK = 0;
  static ERROR = 1; // unknown error
  static INVALID_CREDENTIALS = 2;
  static FORBIDDEN = 3;

  constructor(status, message, path, metadata, entries, data)
  {
    this.status = status;
    this.message = message;
    this.path = path;
    this.metadata = metadata;
    this.entries = entries; // Metadata
    this.data = data; // file data
  }
}

class Metadata
{
  static COLLECTION = 1;
  static FILE = 2;

  constructor(name, description, type, size = 0, lastModified = 0)
  {
    this.name = name;
    this.description = description;
    this.type = type;
    this.size = size;
    this.lastModified = lastModified;
  }
}

export {FileService, Result, Metadata };