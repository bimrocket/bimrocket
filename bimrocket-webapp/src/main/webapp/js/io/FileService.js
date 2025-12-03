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

  move(sourcePath, destinationPath, readyCallback, progressCallback)
  {
    readyCallback(new Result(Result.ERROR, "Not implemented."));
  }

  copy(sourcePath, destinationPath, readyCallback, progressCallback)
  {
    readyCallback(new Result(Result.ERROR, "Not implemented."));
  }

  setACL(path, acl, readyCallback)
  {
    readyCallback(new Result(Result.ERROR, "Not implemented."));
  }

  getACL(path, readyCallback)
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
  static BAD_REQUEST = 4;

  constructor(status, message, path, metadata, entries, data)
  {
    this.status = status;
    this.message = message;
    this.path = path;
    this.metadata = metadata; // Metadata
    this.entries = entries; // array of Metadata
    this.data = data; // file data or ACL
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

class ACL
{
  constructor(roles = {})
  {
    this.roles = roles;
  }

  getPrivileges(roleId)
  {
    return this.roles[roleId] || [];
  }

  grant(roleId, privilege)
  {
    // At this point assume privilege has an indentifier format
    if (typeof privilege !== "string" ||
        !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(privilege))
      throw "Invalid privilege: " + privilege;

    let privileges = this.roles[roleId];
    if (!privileges)
    {
      privileges = [];
      this.roles[roleId] = privileges;
    }
    if (!privileges.includes(privilege)) privileges.push(privilege);
  }

  revoke(roleId, privilege)
  {
    let privileges = this.roles[roleId];
    if (privileges)
    {
      let index = privileges.indexOf(privilege);
      if (index !== -1)
      {
        privileges.splice(index, 1);
      }
    }
  }

  fromJSON(json)
  {
    let roles = JSON.parse(json);
    let acl = new ACL();

    // check structure
    for (const roleId in roles)
    {
      const privileges = roles[roleId];
      if (!(privileges instanceof Array))
        throw "An array of privileges was expected for this role: " + roleId;

      for (const privilege of privileges)
      {
        acl.grant(roleId, privilege);
      }
    }
    this.roles = acl.roles;
  }

  toJSON()
  {
    return JSON.stringify(this.roles, null, 2);
  }
}

export { FileService, Result, Metadata, ACL };