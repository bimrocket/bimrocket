/**
 * IDBFileService.js
 *
 * @author realor
 */

import { IOManager } from "platform/io/IOManager.js";
import { FileService, Metadata, Result } from "platform/io/FileService.js";
import { ServiceError } from "platform/io/Service.js";
import { ServiceManager } from "platform/io/ServiceManager.js";

const {
  BAD_REQUEST,
  NOT_FOUND,
  INTERNAL_ERROR,
  UNKNOWN_ERROR
} = ServiceError;

const { COLLECTION, FILE } = Metadata;

class IDBFileService extends FileService
{
  constructor(parameters)
  {
    super(parameters);
  }

  setParameters(parameters)
  {
    super.setParameters(parameters);
    if (!this.url) this.url = "default";
  }

  find(path, options, onCompleted)
  {
    new ReadOperation(this.url, onCompleted)
      .setPath(path)
      .setLoadFileData(false)
      .execute();
  }

  read(path, onCompleted, onProgress)
  {
    new ReadOperation(this.url, onCompleted)
      .setPath(path)
      .setLoadFileData(true)
      .execute();
  }

  write(path, data, onCompleted, onProgress)
  {
    new WriteOperation(this.url, onCompleted)
      .setPath(path)
      .setData(data)
      .execute();
  }

  remove(path, onCompleted, onProgress)
  {
    new RemoveOperation(this.url, onCompleted)
      .setPath(path)
      .execute();
  }

  makeCollection(path, onCompleted, onProgress)
  {
    new MakeCollectionOperation(this.url, onCompleted)
      .setPath(path)
      .execute();
  }

  move(sourcePath, destinationPath, onCompleted)
  {
    new MoveOperation(this.url, onCompleted)
      .setSourcePath(sourcePath)
      .setDestinationPath(destinationPath)
      .execute();
  }

  copy(sourcePath, destinationPath, onCompleted, onProgress)
  {
    new CopyOperation(this.url, onCompleted)
      .setSourcePath(sourcePath)
      .setDestinationPath(destinationPath)
      .execute();
  }
}

class Operation
{
  constructor(dbName, onCompleted, onProgress)
  {
    this.dbName = dbName;
    this.index = 0,
    this.nodeId = 0;
    this.nodes = [];
    this.pathArray = null;
    this.store = null;
    this.isUpdate = true;
    this.onCompleted = onCompleted;
    this.onProgress = onProgress;
  }

  onStoreReady()
  {
    this.onCompleted?.(OK);
  }

  onLastNode()
  {
    this.error(BAD_REQUEST, "Invalid operation.");
  }

  onNewNode()
  {
    this.error(BAD_REQUEST, "Invalid operation.");
  }

  execute()
  {
    const openReq = indexedDB.open(this.dbName, 1);

    // Create the schema
    openReq.onupgradeneeded = () =>
    {
      const db = openReq.result;
      const store = db.createObjectStore("nodes", { keyPath: "id" });

      // create root node
      const rootNode = {
        id : 0,
        entries : {},
        lastId : 0
      };
      store.put(rootNode);
    };

    openReq.onsuccess = () =>
    {
      const db = openReq.result;
      const tx = db.transaction("nodes", "readwrite");
      const store = tx.objectStore("nodes");
      this.store = store;

      tx.oncomplete = () =>
      {
        db.close();
        if (this.isUpdate)
        {
          this.onCompleted?.(new Result());
        }
      };

      tx.onerror = (event) =>
      {
        this.error(INTERNAL_ERROR, event.error);
      };

      this.onStoreReady();
    };

    openReq.onerror = (event) =>
    {
      this.error(INTERNAL_ERROR, event.error);
    };
  }

  loadPath(path)
  {
    if (path.startsWith("//")) path = path.substring(1);
    const pathArray = path === "/" ? [""] : path.split("/");

    this.pathArray = pathArray;
    this.index = 0;
    this.nodeId = 0;
    this.nodes = [];
    this.loadNextNode();
  }

  loadNextNode()
  {
    const getReq = this.store.get(this.nodeId);

    getReq.onsuccess = () =>
    {
      const node = getReq.result;
      const pathArray = this.pathArray;
      const store = this.store;

      if (!node)
      {
        this.error(NOT_FOUND, "Invalid path.");
        return;
      }

      this.nodes.push(node);

      if (this.index === pathArray.length - 1)
      {
        this.onLastNode();
      }
      else if (node.entries)
      {
        this.index++;
        let name = pathArray[this.index];

        let entry = node.entries[name];
        if (entry)
        {
          this.nodeId = entry.id;
          this.loadNextNode();
        }
        else if (this.index === pathArray.length - 1)
        {
          this.onNewNode();
        }
        else
        {
          this.error(NOT_FOUND, "Not found.");
        }
      }
      else
      {
        this.error(NOT_FOUND, "Not found.");
      }
    };

    getReq.onerror = (event) =>
    {
      this.error(UNKNOWN_ERROR, event.error);
    };
  }

  nextNodeId()
  {
    const store = this.store;
    const rootNode = this.nodes[0];
    rootNode.lastId++;
    store.put(rootNode);
    return rootNode.lastId;
  }

  error(code, message)
  {
    const error = new ServiceError(code, message);
    this.onCompleted?.(new Result({ error }));
  }

  getSize(data)
  {
    if (!data) return 0;
    return typeof data === "string" ? data.length : data.size;
  }
}

class ReadOperation extends Operation
{
  constructor(dbName, onCompleted)
  {
    super(dbName, onCompleted);
    this.path = null;
    this.loadFileData = false;
    this.isUpdate = false;
  }

  setPath(path)
  {
    this.path = path;
    return this;
  }

  setLoadFileData(loadFileData = false)
  {
    this.loadFileData = loadFileData;
    return this;
  }

  onStoreReady()
  {
    this.loadPath(this.path);
  }

  onNewNode()
  {
    this.error(NOT_FOUND, "Not found.");
  }

  async onLastNode()
  {
    let name = this.pathArray[this.index];
    let path = this.pathArray.join("/");
    if (path === "") path = "/";

    const node = this.nodes[this.index];
    const metadata = new Metadata();
    metadata.name = name;
    metadata.description = name;

    let entries = null;
    let data = null;

    if (node.entries) // dir
    {
      metadata.type = COLLECTION;
      metadata.size = 0;
      metadata.lastModified = 0;
      entries = [];
      for (let fileName in node.entries)
      {
        const entry = node.entries[fileName];
        const fileMetadata = new Metadata();
        fileMetadata.name = fileName;
        fileMetadata.description = fileName;
        fileMetadata.type = entry.type;
        fileMetadata.size = entry.size;
        fileMetadata.lastModified = entry.modified;
        entries.push(fileMetadata);
      }
    }
    else // file
    {
      const parentNode = this.nodes[this.index - 1];
      const entry = parentNode.entries[name];
      metadata.type = FILE;
      metadata.size = entry.size;
      metadata.lastModified = entry.modified;
      if (this.loadFileData)
      {
        let formatInfo = IOManager.getFormatInfo(name);
        let dataType = formatInfo?.dataType || "arraybuffer";

        if (dataType === "text")
        {
          data = await node.data.text();
        }
        else
        {
          data = await node.data.arrayBuffer();
        }
      }
    }
    this.onCompleted?.(new Result({ path, metadata, entries, data }));
  }
}

class WriteOperation extends Operation
{
  constructor(dbName, onCompleted)
  {
    super(dbName, onCompleted);
    this.path = null;
    this.data = null;
  }

  setPath(path)
  {
    this.path = path;
    return this;
  }

  setData(data)
  {
    if (typeof data === "string")
    {
      data = new Blob([data], { type : "text/plain" });
    }
    else if (data instanceof ArrayBuffer)
    {
      data = new Blob([data], { type : "application/octet-stream" });
    }
    this.data = data; // always save data as blob

    return this;
  }

  onStoreReady()
  {
    this.loadPath(this.path);
  }

  onLastNode()
  {
    // update file
    const node = this.nodes[this.index];
    if (node.data)
    {
      const parentNode = this.nodes[this.index - 1];
      const name = this.pathArray[this.index];
      const entry = parentNode.entries[name];
      entry.size = this.getSize(this.data);
      entry.modified = Date.now();
      this.store.put(parentNode);

      node.data = this.data;
      this.store.put(node);

      this.onCompleted?.(new Result());
    }
    else // attempt to replace collection by file
    {
      this.error(BAD_REQUEST, "A directory with the same name already exists.");
    }
  }

  onNewNode()
  {
    // create new file
    const store = this.store;
    const parentNode = this.nodes[this.index - 1];
    const pathArray = this.pathArray;
    const name = pathArray[this.index];

    let nodeId = this.nextNodeId();

    // register file in node entries
    parentNode.entries[name] = {
      id : nodeId,
      type : FILE,
      size : this.getSize(this.data),
      modified : Date.now()
    };
    store.put(parentNode);

    // create new file node
    const fileNode = {
      id: nodeId,
      data : this.data
    };
    this.store.put(fileNode);
  }
}

class RemoveOperation extends Operation
{
  constructor(dbName, onCompleted)
  {
    super(dbName, onCompleted);
    this.path = null;
  }

  setPath(path)
  {
    this.path = path;
    return this;
  }

  onStoreReady()
  {
    this.loadPath(this.path);
  }

  onLastNode()
  {
    const store = this.store;
    const nodes = this.nodes;
    const node = nodes[this.index];
    const parentNode = nodes[this.index - 1];

    const name = this.pathArray[this.index];
    const entry = parentNode.entries[name];
    if (entry.type === COLLECTION && Object.keys(node.entries).length > 0)
    {
      this.error(BAD_REQUEST, "Directory is not empty.");
    }
    else
    {
      delete parentNode.entries[name];

      store.put(parentNode);
      store.delete(node.id);
    }
  }
}

class MakeCollectionOperation extends Operation
{
  constructor(dbName, onCompleted)
  {
    super(dbName, onCompleted);
    this.path = null;
  }

  setPath(path)
  {
    this.path = path;
    return this;
  }

  onStoreReady()
  {
    this.loadPath(this.path);
  }

  onLastNode()
  {
    this.error(BAD_REQUEST, "A directory with the same name already exists.");
  }

  onNewNode()
  {
    const store = this.store;
    const parentNode = this.nodes[this.index - 1];
    const pathArray = this.pathArray;
    const name = pathArray[this.index];

    let nodeId = this.nextNodeId();

    // register collection name in node entries
    parentNode.entries[name] = {
      id : nodeId,
      type : COLLECTION,
      size : 0,
      modified: Date.now()
    };
    store.put(parentNode);

    // create new collection node
    const colNode = {
      id: nodeId,
      entries: {}
    };
    this.store.put(colNode);
  }
}

class RenameOperation extends Operation
{
  constructor(dbName, onCompleted)
  {
    super(dbName, onCompleted);
    this.path = null;
    this.newName = null;
  }

  setPath(path)
  {
    this.path = path;
    return this;
  }

  setNewName(newName)
  {
    this.newName = newName;
    return this;
  }

  onStoreReady()
  {
    this.loadPath(this.path);
  }

  onLastNode()
  {
    const store = this.store;
    const newName = this.newName;
    let name = this.pathArray[this.index];
    if (name !== newName)
    {
      const parentNode = this.nodes[this.index - 1];
      if (parentNode.entries[newName])
      {
        // a resource already exists with newName
        this.error(BAD_REQUEST, "A file alredy exists with the same name.");
        return;
      }
      let entry = parentNode.entries[name];
      delete parentNode.entries[name];
      parentNode.entries[newName] = entry;

      store.put(parentNode);
    }
  }
}

class TransferOperation extends Operation
{
  constructor(dbName, onCompleted)
  {
    super(dbName, onCompleted);
    this.sourcePath = null;
    this.destinationPath = null;
    this.state = 0;
  }

  setSourcePath(sourcePath)
  {
    this.sourcePath = sourcePath;
    return this;
  }

  setDestinationPath(destinationPath)
  {
    this.destinationPath = destinationPath;
    return this;
  }

  onStoreReady()
  {
    this.loadPath(this.sourcePath);
  }

  getNewName()
  {
    let sourcePath = this.sourcePath;
    let destinationPath = this.destinationPath;

    const srcIndex = sourcePath.lastIndexOf("/");
    let srcBase, srcName;
    if (srcIndex === -1)
    {
      srcBase = "";
      srcName = sourcePath;
    }
    else
    {
      srcBase = sourcePath.substring(0, srcIndex);
      srcName = sourcePath.substring(srcIndex + 1);
    }

    const destIndex = destinationPath.lastIndexOf("/");
    let destBase, destName;
    if (destIndex === -1)
    {
      destBase = "";
      destName = destinationPath;
    }
    else
    {
      destBase = destinationPath.substring(0, destIndex);
      destName = destinationPath.substring(destIndex + 1);
    }

    return srcBase === destBase ? destName : null;
  }
}

class MoveOperation extends TransferOperation
{
  constructor(dbName, onCompleted)
  {
    super(dbName, onCompleted);
  }

  onLastNode()
  {
    const store = this.store;
    const nodes = this.nodes;

    if (this.state === 0)
    {
      const name = this.pathArray[this.index];
      const newName = this.getNewName();

      if (name === newName)
      {
        // do nothing
      }
      else if (newName) // rename file/folder
      {
        const parentNode = nodes[this.index - 1];
        const entry = parentNode.entries[name];
        delete parentNode.entries[name];
        parentNode.entries[newName] = entry;
        store.put(parentNode);
      }
      else // move to other folder
      {
        this.cutParentNode = nodes[this.index - 1];

        // remove and save entry from parent directory
        this.cutEntry = this.cutParentNode.entries[name];
        delete this.cutParentNode.entries[name];

        this.state = 1;
        this.loadPath(this.destinationPath);
      }
    }
    else
    {
      // destination exists, replace it
      this.pasteNode();
    }
  }

  onNewNode()
  {
    if (this.state === 0)
    {
      // source does not exists
      this.error(NOT_FOUND, "Not found.");
    }
    else
    {
      // paste node
      this.pasteNode();
    }
  }

  pasteNode()
  {
    const store = this.store;
    const nodes = this.nodes;
    const parentNode = nodes[this.index - 1];
    const pathArray = this.pathArray;
    const name = pathArray[this.index];
    const cutParentNode = this.cutParentNode;
    const cutEntry = this.cutEntry;

    const oldNode = nodes[this.index];
    if (oldNode)
    {
      console.info("remove " + oldNode.id);
      store.delete(oldNode.id);
    }

    parentNode.entries[name] = cutEntry;
    store.put(cutParentNode);
    store.put(parentNode);
  }
}

class CopyOperation extends TransferOperation
{
  constructor(dbName, onCompleted)
  {
    super(dbName, onCompleted);
  }

  onLastNode()
  {
    const store = this.store;
    const nodes = this.nodes;

    if (this.state === 0)
    {
      const name = this.pathArray[this.index];
      const newName = this.getNewName();
      const node = nodes[this.index];
      const parentNode = nodes[this.index - 1];
      const entry = parentNode.entries[name];

      if (name === newName)
      {
        // do nothing (copy to itself)
      }
      else if (newName) // copy to same folder
      {
        const newEntry = {
          id: this.nextNodeId(),
          type : entry.type,
          size : entry.size,
          modified: Date.now()
        };
        const newNode = {
          id : newEntry.id,
          data : node.data
        };

        parentNode.entries[newName] = newEntry;
        store.put(parentNode);
        store.put(newNode);
      }
      else // copy to other folder
      {
        this.copyNode = node;
        this.copyEntry = entry;

        this.state = 1;
        this.loadPath(this.destinationPath);
      }
    }
    else
    {
      // destination exists, replace it
      this.pasteNode();
    }
  }

  onNewNode()
  {
    if (this.state === 0)
    {
      // source does not exists
      this.error(NOT_FOUND, "Not found.");
    }
    else
    {
      // paste node
      this.pasteNode();
    }
  }

  pasteNode()
  {
    const store = this.store;
    const nodes = this.nodes;
    const parentNode = nodes[this.index - 1];
    const pathArray = this.pathArray;
    const name = pathArray[this.index];
    const copyNode = this.copyNode;
    const copyEntry = this.copyEntry;

    const oldNode = nodes[this.index];
    if (oldNode)
    {
      store.delete(oldNode.id);
    }

    const newEntry = {
      id: this.nextNodeId(),
      type : copyEntry.type,
      size : copyEntry.size,
      modified: Date.now()
    };
    const newNode = {
      id : newEntry.id,
      data : copyNode.data
    };

    parentNode.entries[name] = newEntry;
    store.put(parentNode);
    store.put(newNode);
  }
}

ServiceManager.addClass(IDBFileService);

export { IDBFileService };