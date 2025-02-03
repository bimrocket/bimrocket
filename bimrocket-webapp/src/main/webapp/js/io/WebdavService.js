/*
 * WebdavService.js
 *
 * @author realor
 */

import { IOManager } from "./IOManager.js";
import { FileService, Metadata, Result } from "./FileService.js";
import { ServiceManager } from "./ServiceManager.js";
import { WebUtils } from "../utils/WebUtils.js";

class WebdavService extends FileService
{
  static PROXY_URI = "/bimrocket-server/api/proxy?url=";

  constructor(parameters)
  {
    super(parameters);
  }

  getParameters()
  {
    const parameters = super.getParameters();
    parameters.useProxy = this.useProxy;
    parameters.proxyUsername = this.proxyUsername;
    parameters.proxyPassword = this.proxyPassword;
    return parameters;
  }

  setParameters(parameters)
  {
    super.setParameters(parameters);
    this.useProxy = parameters.useProxy || false;
    this.proxyUsername = parameters.proxyUsername || null;
    this.proxyPassword = parameters.proxyPassword || null;
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

              if (hrefValue.startsWith("http:") ||
                  hrefValue.startsWith("https:"))
              {
                let resUrl = new URL(hrefValue);
                hrefValue = resUrl.pathname;
              }

              if (hrefValue.endsWith("/"))
                hrefValue = hrefValue.substring(0, hrefValue.length - 1);

              hrefValue = decodeURI(hrefValue);

              let fileName = hrefValue.substring(baseUri.length);
              let isCollectionNode = responseNode.querySelector(
                "propstat prop resourcetype collection") !== null;
              let contentLengthNode = responseNode.querySelector(
                "propstat prop getcontentlength");
              let lastModifiedNode = responseNode.querySelector(
                "propstat prop getlastmodified");

              let fileSize = contentLengthNode ?
                parseInt(contentLengthNode.textContent) : 0;
              let lastModified = lastModifiedNode ?
                parseInt(lastModifiedNode.textContent) : 0;

              if (fileName.indexOf("/") === 0) fileName = fileName.substring(1);

              if (fileName.length === 0) // requested resource
              {
                let index = hrefValue.lastIndexOf("/");
                metadata.name = hrefValue.substring(index + 1);
                metadata.description = metadata.name;
                metadata.type = isCollectionNode ? COLLECTION : FILE;
                metadata.size = fileSize;
                metadata.lastModified = lastModified;
              }
              else
              {
                let entry = new Metadata(fileName, fileName,
                  isCollectionNode ? COLLECTION : FILE, fileSize, lastModified);
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
            let formatInfo = IOManager.getFormatInfo(metadata.name);
            let dataType = formatInfo?.dataType || "text";
            request.responseType = dataType;

            request.onload = () =>
            {
              if (request.status === 200)
              {
                if (progressCallback)
                {
                  progressCallback({progress : 100,
                    message : "Download completed."});
                }
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
            this.openRequest("GET", url, request);
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
        readyCallback(this.createError("Can't open", request.status));
      }
    };
    this.openRequest("PROPFIND", url, request);
    request.setRequestHeader("depth", "1");
    request.send();
  }

  save(path, data, readyCallback, progressCallback)
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
        readyCallback(this.createError("Save failed", request.status));
      }
    };
    if (progressCallback)
    {
      request.onprogress = event =>
      {
        let progress = Math.round(
          100 * event.loaded / event.total);
        let message = "Uploading file...";
        progressCallback({progress : progress, message : message});
      };
    }
    this.openRequest("PUT", url, request);
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
    this.openRequest("DELETE", url, request);
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
    this.openRequest("MKCOL", url, request);
    request.send();
  }

  openRequest(method, url, request)
  {
    if (this.useProxy)
    {
      url = WebdavService.PROXY_URI + url;
    }
    request.open(method, encodeURI(url), true);

    const credentials = this.getCredentials();

    if (this.useProxy)
    {
      WebUtils.setBasicAuthorization(request, this.proxyUsername, this.proxyPassword);
      if (credentials.username && credentials.password)
      {
        WebUtils.setBasicAuthorization(request,
          credentials.username, credentials.password, "Forwarded-Authorization");
      }
    }
    else
    {
      WebUtils.setBasicAuthorization(request,
        credentials.username, credentials.password);
    }
  }

  createError(message, status)
  {
    let statusMessage = WebUtils.getHttpStatusMessage(status);
    if (statusMessage.length > 0)
    {
      message += ": " + statusMessage;
    }
    message += " (HTTP " + status + ").";

    let resultStatus;
    switch (status)
    {
      case 401: resultStatus = Result.INVALID_CREDENTIALS; break;
      case 403: resultStatus = Result.FORBIDDEN; break;
      default: resultStatus = Result.ERROR;
    }
    return new Result(resultStatus, message);
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
