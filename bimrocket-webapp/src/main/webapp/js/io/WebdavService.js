/*
 * WebdavService.js
 *
 * @author: realor
 */

import { FileService, Metadata, Result } from "./FileService.js";
import { ServiceManager } from "./ServiceManager.js";

class WebdavService extends FileService
{
  constructor(name, description, url, username, password)
  {
    super(name, description, url, username, password);
  }

  open(path, readyCallback, progressCallback)
  {
    const OK = Result.OK;
    const ERROR = Result.ERROR;
    const COLLECTION = Metadata.COLLECTION;
    const FILE = Metadata.FILE;

    let url = this.getUrl(path);

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

    let request = new XMLHttpRequest();
    request.onerror = () =>
    {
      // ERROR
      readyCallback(new Result(ERROR, "Connection error"));
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
          let metadata = new Metadata();
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
                metadata.type = isCollectionNode ? COLLECTION : FILE;
              }
              else
              {
                let entry = new Metadata(fileName, fileName,
                  isCollectionNode ? COLLECTION : FILE);
                entries.push(entry);
              }
            }
          }
          if (metadata.type === COLLECTION)
          {
            readyCallback(
              new Result(OK, "", path, metadata, entries, null));
          }
          else // download file
          {
            let request = new XMLHttpRequest();
            request.open("GET", url, true);
            request.onload = () =>
            {
              if (request.status === 200)
              {
                progressCallback({progress : 100,
                  message : "Download completed."});
                setTimeout(() => readyCallback(
                  new Result(OK, "", path, metadata, null, request.response))
                  , 100);
              }
            };
            request.onerror = error =>
            {
              readyCallback(new Result(ERROR, error));
            };
            if (progressCallback)
            {
              request.onprogress = event =>
              {
                let progress = Math.round(
                  100 * event.loaded / event.total);
                let message = "Downloading file...";
                progressCallback({progress : progress, message : message});
              };
            }
            this.setCredentials(request);
            request.send();

          }
        }
        catch (ex)
        {
          readyCallback(new Result(ERROR, ex));
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
            readyCallback(new Result(ERROR, node.textContent));
            return;
          }
        }
        readyCallback(this.createError("Can't open", request.status));
      }
    };
    request.open("PROPFIND", url, true);
    request.setRequestHeader("depth", "1");
    this.setCredentials(request);
    request.send();
  }

  save(data, path, readyCallback, progressCallback)
  {
    const OK = Result.OK;
    const ERROR = Result.ERROR;

    const url = this.getUrl(path);
    const request = new XMLHttpRequest();
    request.onerror = error =>
    {
      // ERROR
      readyCallback(new Result(ERROR, "Connection error"));
    };
    request.onload = () =>
    {
      if (request.status === 200)
      {
        readyCallback(new Result(OK));
      }
      else
      {
        readyCallback(this.createError("Save failed", request.status));
      }
    };
    request.open("PUT", url, true);
    this.setCredentials(request);
    request.send(data);
  }

  remove(path, readyCallback, progressCallback)
  {
    const OK = Result.OK;
    const ERROR = Result.ERROR;

    const url = this.getUrl(path);
    const request = new XMLHttpRequest();
    request.onerror = error =>
    {
      // ERROR
      readyCallback(new Result(ERROR, "Connection error"));
    };
    request.onload = () =>
    {
      if (request.status === 200)
      {
        readyCallback(new Result(OK));
      }
      else
      {
        readyCallback(this.createError("Delete failed", request.status));
      }
    };
    request.open("DELETE", url, true);
    this.setCredentials(request);
    request.send();
  }

  makeCollection(path, readyCallback, progressCallback)
  {
    const OK = Result.OK;
    const ERROR = Result.ERROR;

    const url = this.getUrl(path);
    const request = new XMLHttpRequest();
    request.onerror = error =>
    {
      // ERROR
      readyCallback(new Result(ERROR, "Connection error"));
    };
    request.onload = () =>
    {
      if (request.status === 200 || request.status === 201)
      {
        readyCallback(new Result(OK));
      }
      else
      {
        readyCallback(this.createError(
          "Folder creation failed", request.status));
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

  createError(message, status)
  {
    let error = null;
    switch (status)
    {
      case 403:
        error =  "Access forbidden";
        break;
      case 404:
        error = "Not found";
        break;
      case 405:
        error = "Not allowed";
        break;
      case 500:
        error = "Internal server error";
        break;
    }
    if (error) message = message + ": " + error + " (HTTP " + status + ").";
    return new Result(Result.ERROR, message);
  }

  getUrl(path)
  {
    let url = this.url || "";

    if (url && url.endsWith("/"))
    {
      url = url.substring(0, url.length - 1);
    }

    if (path && !path.startsWith("/"))
    {
      path = "/" + path;
    }
    return url + path;
  }
}

ServiceManager.addClass(WebdavService);

export { WebdavService };
