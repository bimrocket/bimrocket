/**
 * FileService.js
 *
 * @author realor
 */

import { Service, ServiceError } from "platform/io/Service.js";

const NotImplementedError =
  new ServiceError(ServiceError.NOT_IMPLEMENTED, "Not implemented.");

class FileService extends Service
{
  constructor(parameters)
  {
    super(parameters);
  }

  /**
   * Finds resources under the given path.
   * Resources are returned in Result.entries.
   *
   * @param {string} path - the resource path
   * @param {Object} options - the find options
   * @param {string] [options.depth] - the search depth: "0", "1", "Infinity"
   * @param {(Result) => void} onCompleted - the function to call when the
   *   find operation completes
   */
  find(path, options, onCompleted)
  {
    onCompleted(new Result({ error : NotImplementedError }));
  }

  /**
   * Reads the data from the file associated with the specified path.
   * The file data is returned in Result.data
   *
   * @param {type} path - the path of the file to read
   * @param {(Result) => void} onCompleted - the function to call when the
   *   read operation completes
   * @param {({ progress: number, message: string }) => void} onProgress -
   *   the function to call to report reading progress
   */
  read(path, onCompleted, onProgress)
  {
    onCompleted(new Result({ error : NotImplementedError }));
  }

  /**
   * Writes the specified data to the file associated with the given path.
   *
   * @param {string} path - the path of the file to write
   * @param {string|Blob} data - the data to write
   * @param {(Result) => void} onCompleted - the function to call when the
   *   write operation completes
   * @param {({ progress: number, message: string }) => void} onProgress -
   *   the function to call to report writing progress
   */
  write(path, data, onCompleted, onProgress)
  {
    onCompleted(new Result({ error : NotImplementedError }));
  }

  /**
   * Removes the file associated with the specified path.
   *
   * @param {string} path - the path of the file to remove
   * @param {(Result) => void} onCompleted - the function to call when the
   *   remove operation completes
   * @param {({ progress: number, message: string }) => void} onProgress -
   *   the function to call to report removing progress
   */
  remove(path, onCompleted, onProgress)
  {
    onCompleted(new Result({ error : NotImplementedError }));
  }

  /**
   * Creates a collection in the specified path.
   *
   * @param {string} path - the path of the new collection
   * @param {(Result) => void} onCompleted - the function to call when this
   *   operation completes
   */
  makeCollection(path, onCompleted)
  {
    onCompleted(new Result({ error : NotImplementedError }));
  }

  /**
   * Moves a resource from a source path to a destination path.
   *
   * @param {string} sourcePath - the source path
   * @param {string} destinationPath - the destination path
   * @param {(Result) => void} onCompleted - the function to call when the
   *   move operation completes
   * @param {({ progress: number, message: string }) => void} onProgress -
   *   the function to call to report moving progress
   */
  move(sourcePath, destinationPath, onCompleted, onProgress)
  {
    onCompleted(new Result({ error : NotImplementedError }));
  }

  /**
   * Copies a resource from a source path to a destination path.
   *
   * @param {string} sourcePath - the source path
   * @param {string} destinationPath - the destination path
   * @param {(Result) => void} onCompleted - the function to call when the
   *   copy operation completes
   * @param {({ progress: number, message: string }) => void} onProgress -
   *   the function to call to report copying progress
   */
  copy(sourcePath, destinationPath, onCompleted, onProgress)
  {
    onCompleted(new Result({ error : NotImplementedError }));
  }

  /**
   * Gets the properties from the resource associated with the specified path.
   * The properties are returned in Result.data.
   *
   * @param {string} path - the resource path
   * @param {string[]} names - the names of the properties to be obtained
   * @param {(Result) => void} onCompleted - the function to call when this
   *   operation completes
   */
  getProperties(path, names, onCompleted)
  {
    onCompleted(new Result({ error : NotImplementedError }));
  }

  /**
   * Sets the properties to the resource associated with the specified path.
   *
   * @param {string} path - the resource path
   * @param {object} properties - the properties to set
   * @param {(Result) => void} onCompleted - the function to call when this
   *   operation completes
   */
  setProperties(path, properties, onCompleted)
  {
    onCompleted(new Result({ error : NotImplementedError }));
  }

  /**
   *  Gets the ACL from the resource associated with the specified path.
   *  The ACL is returned in Result.data.
   *
   * @param {string} path - the resource path
   * @param {(Result) => void} onCompleted - the function to call when this
   *   operation completes
   */
  getACL(path, onCompleted)
  {
    onCompleted(new Result({ error : NotImplementedError }));
  }

  /**
   * Sets the ACL to the resource associated with the specified path.
   *
   * @param {string} path - the resource path
   * @param {ACL} acl - the ACL to set
   * @param {(Result) => void} onCompleted - the function to call when this
   *   operation completes
   */
  setACL(path, acl, onCompleted)
  {
    onCompleted(new Result({ error : NotImplementedError }));
  }

  // deprecated methods

  open(path, onCompleted, onProgress)
  {
    this.find(path, null, result =>
    {
      if (result.status === Result.OK)
      {
        if (result.metadata.type === Metadata.COLLECTION)
        {
          onCompleted(result);
        }
        else // FILE
        {
          this.read(path, downloadResult =>
          {
            onCompleted(downloadResult);
          }, onProgress);
        }
      }
      else
      {
        onCompleted(result);
      }
    });
  }

  save(path, data, onCompleted, onProgress)
  {
    this.write(path, data, onCompleted, onProgress);
  }
}

class Result
{
  static OK = 0;
  static ERROR = 1;

  constructor(info)
  {
    if (info)
    {
      this.status = info.error ? Result.ERROR : Result.OK;
      this.message = info.message; // string
      this.path = info.path; // resource path
      this.metadata = info.metadata; // Metadata
      this.entries = info.entries; // array of Metadata
      this.data = info.data; // file data or ACL
      this.error = info.error; // ServiceError
    }
    else this.status = Result.OK;
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
    this.type = type; // Metadata.COLLECTION | Metadata.FILE
    this.size = size;
    this.lastModified = lastModified; // epoch number
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