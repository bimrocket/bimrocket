/**
 * IDBFileService.js
 *
 * @author realor
 */

import { FileService, Metadata, Result } from "./FileService.js";
import { ServiceManager } from "./ServiceManager.js";
import { IOManager } from "./IOManager.js";

const OK = Result.OK;
const ERROR = Result.ERROR;
const COLLECTION = Metadata.COLLECTION;
const FILE = Metadata.FILE;

class IDBFileService extends FileService
{
  constructor(name, description = null,
    url = null, username = null, password = null)
  {
    super(name, description, url, username, password);
  }

  open(path, readyCallback, progressCallback)
  {
    const openAction = new OpenAction();
    openAction.execute(this.name, path, readyCallback);
  }

  save(path, data, readyCallback, progressCallback)
  {
    const saveAction = new SaveAction(data);
    saveAction.execute(this.name, path, readyCallback, data);
  }

  remove(path, readyCallback, progressCallback)
  {
    const removeAction = new RemoveAction();
    removeAction.execute(this.name, path, readyCallback);
  }

  makeCollection(path, readyCallback, progressCallback)
  {
    const mkColAction = new MakeCollectionAction();
    mkColAction.execute(this.name, path, readyCallback);
  }
}

class Action
{
  constructor()
  {
    this.index = 0,
    this.nodeId = 0;
    this.nodes = [];
    this.pathArray = null;
    this.readyCallback = null;
  }

  execute(dbName, path, readyCallback)
  {
    if (path.startsWith("//")) path = path.substring(1);
    const pathArray = path === "/" ? [""] : path.split("/");

    this.pathArray = pathArray;
    this.readyCallback = readyCallback;

    const openReq = indexedDB.open(dbName, 1);

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
      };

      tx.onerror = (event) =>
      {
        this.error(event.error);
      };

      this.loadNextNode();
    };

    openReq.onerror = (event) =>
    {
      this.error(event.error);
    };
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
        this.error("Invalid path");
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
          this.error("Invalid operation");
        }
      }
      else
      {
        this.error("Invalid path");
      }
    };

    getReq.onerror = (event) =>
    {
      this.error(event.error);
    };
  }

  createNodeId()
  {
    const store = this.store;
    const rootNode = this.nodes[0];
    rootNode.lastId++;
    store.put(rootNode);
    return rootNode.lastId;
  }

  onLastNode()
  {
    this.error("Invalid operation");
  }

  onNewNode()
  {
    this.error("Invalid operation");
  }

  error(msg)
  {
    this.readyCallback(new Result(ERROR, msg));
  }

  getSize(data)
  {
    if (!data) return 0;
    return typeof data === "string" ? data.length : data.size;
  }
}

class OpenAction extends Action
{
  constructor()
  {
    super();
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
      const mimeType = node.data.type || "text/plain";
      const formatInfo = IOManager.getFormatInfoByMimeType(mimeType);
      if (formatInfo?.dataType === "arraybuffer")
      {
        data = await node.data.arrayBuffer();
      }
      else
      {
        data = await node.data.text();
      }
    }
    this.readyCallback(new Result(OK, "", path, metadata, entries, data));
  }
}

class SaveAction extends Action
{
  constructor(data)
  {
    super();
    if (typeof data === "string")
    {
      data = new Blob([data], { type : "text/plain" });
    }
    else if (data instanceof ArrayBuffer)
    {
      data = new Blob([data], { type: "application/octet-stream" });
    }
    this.data = data; // always save data as blob
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

      this.readyCallback(new Result(OK));
    }
    else // attempt to replace collection by file
    {
      this.error("A directory exists with the same name");
    }
  }

  onNewNode()
  {
    // create new file
    const store = this.store;
    const parentNode = this.nodes[this.index - 1];
    const pathArray = this.pathArray;
    const name = pathArray[this.index];

    let nodeId = this.createNodeId();

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

    this.readyCallback(new Result(OK));
  }
}

class RemoveAction extends Action
{
  constructor()
  {
    super();
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
      this.error("Directory is not empty");
    }
    else
    {
      delete parentNode.entries[name];

      store.put(parentNode);
      store.delete(node.id);

      this.readyCallback(new Result(OK));
    }
  }
}

class MakeCollectionAction extends Action
{
  constructor()
  {
    super();
  }

  onLastNode()
  {
    this.error("Name already exist");
  }

  onNewNode()
  {
    const store = this.store;
    const parentNode = this.nodes[this.index - 1];
    const pathArray = this.pathArray;
    const name = pathArray[this.index];

    let nodeId = this.createNodeId();

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
    this.readyCallback(new Result(OK));
  }
}

ServiceManager.addClass(IDBFileService);

export { IDBFileService };