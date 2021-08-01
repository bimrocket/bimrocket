/*
 * WebdavService.js
 *
 * @author: realor
 */

import { IOService, IOMetadata, IOResult } from "./IOService.js";
import { ServiceManager } from "./ServiceManager.js";
import { IOManager } from "./IOManager.js";

class WebdavService extends IOService
{
  constructor(name, description, url, username, password)
  {
    super(name, description, url, username, password);
  }

  open(path, options, readyCallback, progressCallback)
  {
    const OK = IOResult.OK;
    const ERROR = IOResult.ERROR;
    const COLLECTION = IOMetadata.COLLECTION;
    const OBJECT = IOMetadata.OBJECT;

    if (this.url && this.url.endsWith("/"))
    {
      this.url = this.url.substring(0, this.url.length - 1);
    }

    let url = this.url + path;

    let baseUri = url;
    let index = baseUri.indexOf("://");
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

    const request = new XMLHttpRequest();
    let metadata;
    request.onerror = error =>
    {
      // ERROR
      readyCallback(new IOResult(ERROR, "Connection error"));
    };
    request.onload = () =>
    {
      if (request.status === 200 || request.status === 207)
      {
        try
        {
          // OK
          let xml = request.responseXML;
          let multiNode = xml.childNodes[0];
          let responseNodes = multiNode.childNodes;
          metadata = new IOMetadata();
          let entries = [];
          for (let i = 0; i < responseNodes.length; i++)
          {
            let responseNode = responseNodes[i];
            if (responseNode.localName === "response")
            {
              let hrefNode = responseNode.querySelector("href");
              let hrefValue = hrefNode.textContent;
              let fileName = hrefValue.substring(baseUri.length);
              let isCollectionNode = responseNode.querySelector(
                "propstat prop resourcetype collection") !== null;
              if (fileName.indexOf("/") === 0) fileName = fileName.substring(1);

              if (fileName.length === 0) // requested resource
              {
                let index = hrefValue.lastIndexOf("/");
                metadata.name = hrefValue.substring(index + 1);
                metadata.description = metadata.name;
                metadata.type = isCollectionNode ? COLLECTION : OBJECT;
              }
              else
              {
                let entry = new IOMetadata(fileName, fileName,
                  isCollectionNode ? COLLECTION : OBJECT);
                entries.push(entry);
              }
            }
          }
          if (metadata.type === COLLECTION)
          {
            readyCallback(
              new IOResult(OK, "", path, metadata, entries, null));
          }
          else
          {
            // read OBJECT
            const intent =
            {
              url : url,
              onCompleted : function(object)
              {
                readyCallback(new IOResult(OK, "", path,
                  metadata, null, object));
              },
              onProgress : progressCallback,
              onError : function(message)
              {
                readyCallback(new IOResult(ERROR, message));
              },
              options : options
            };
            IOManager.load(intent);
          }
        }
        catch (ex)
        {
          readyCallback(new IOResult(ERROR, ex));
        }
      }
      else
      {
        if (request.responseXML)
        {
          let node =
            request.responseXML.querySelector("error message");
          if (node)
          {
            readyCallback(new IOResult(ERROR, node.textContent));
            return;
          }
        }
        readyCallback(new IOResult(ERROR, "Error " + request.status));
      }
    };
    request.open("PROPFIND", url, true);
    request.setRequestHeader("depth", "1");
    this.setCredentials(request);
    request.send();
  }

  download(path, options, readyCallback, progressCallback)
  {
    const OK = IOResult.OK;
    const ERROR = IOResult.ERROR;
    const OBJECT = IOMetadata.OBJECT;

    if (this.url && this.url.endsWith("/"))
    {
      this.url = this.url.substring(0, this.url.length - 1);
    }

    let url = this.url + path;

    const request = new XMLHttpRequest();
    let metadata;
    request.onerror = error =>
    {
      // ERROR
      readyCallback(new IOResult(ERROR, "Connection error"));
    };
    request.onload = () =>
    {
      if (request.status === 200)
      {
        const index = path.lastIndexOf("/");
        let name = index !== -1 ? path.substring(index + 1) : path;
        readyCallback(new IOResult(OK, "", path,
          new IOMetadata(name, null, OBJECT, 0),
          null, null, request.response));
      }
    };
    request.open("GET", url, true);
    this.setCredentials(request);
    request.send();
  }

  save(object, path, options, readyCallback, progressCallback)
  {
    const OK = IOResult.OK;
    const ERROR = IOResult.ERROR;

    const url = this.url + path;
    const request = new XMLHttpRequest();
    request.onerror = error =>
    {
      // ERROR
      readyCallback(new IOResult(ERROR, "Connection error"));
    };
    request.onload = () =>
    {
      if (request.status === 200)
      {
        readyCallback(new IOResult(OK));
      }
      else
      {
        readyCallback(new IOResult(ERROR,
          "Save failed (error " + request.status + ")."));
      }
    };
    const intent =
    {
      name : path,
      object : object,
      onCompleted : data =>
      {
        request.open("PUT", url, true);
        this.setCredentials(request);
        request.send(data);
      },
      onProgress : progressCallback,
      onError : message =>
        readyCallback(new IOResult(ERROR, message)),
      options : options
    };
    IOManager.export(intent);
  }

  upload(data, path, options, readyCallback, progressCallback)
  {
    const OK = IOResult.OK;
    const ERROR = IOResult.ERROR;

    const url = this.url + path;
    const request = new XMLHttpRequest();
    request.onerror = error =>
    {
      // ERROR
      readyCallback(new IOResult(ERROR, "Connection error"));
    };
    request.onload = () =>
    {
      if (request.status === 200)
      {
        readyCallback(new IOResult(OK));
      }
      else
      {
        readyCallback(new IOResult(ERROR,
          "Upload failed (error " + request.status + ")."));
      }
    };
    request.open("PUT", url, true);
    this.setCredentials(request);
    request.send(data);
  }

  remove(path, readyCallback, progressCallback)
  {
    const OK = IOResult.OK;
    const ERROR = IOResult.ERROR;

    const url = this.url + path;
    const request = new XMLHttpRequest();
    request.onerror = error =>
    {
      // ERROR
      readyCallback(new IOResult(ERROR, "Connection error"));
    };
    request.onload = () =>
    {
      if (request.status === 200)
      {
        readyCallback(new IOResult(OK));
      }
      else
      {
        readyCallback(new IOResult(ERROR,
          "Delete failed (error " + request.status + ")."));
      }
    };
    request.open("DELETE", url, true);
    this.setCredentials(request);
    request.send();
  }

  makeCollection(path, readyCallback, progressCallback)
  {
    const OK = IOResult.OK;
    const ERROR = IOResult.ERROR;

    const url = this.url + path;
    const request = new XMLHttpRequest();
    request.onerror = error =>
    {
      // ERROR
      readyCallback(new IOResult(ERROR, "Connection error"));
    };
    request.onload = () =>
    {
      if (request.status === 200 || request.status === 201)
      {
        readyCallback(new IOResult(OK));
      }
      else
      {
        readyCallback(new IOResult(ERROR,
          "Collection creation failed (error " + request.status + ")."));
      }
    };
    request.open("MKCOL", url, true);
    this.setCredentials(request);
    request.send();
  }

  setCredentials(request)
  {
    if (this.username && this.password)
    {
      const userPass = this.username + ":" + this.password;
      request.setRequestHeader("Authorization", "Basic " + btoa(userPass));
    }
  }
}

ServiceManager.addClass(WebdavService);

export { WebdavService };
