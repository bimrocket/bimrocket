/*
 * WebdavService.js
 *
 * @author realor
 */

import { IOManager } from "./IOManager.js";
import { FileService, Metadata, Result, ACL } from "./FileService.js";
import { ServiceManager } from "./ServiceManager.js";
import { WebUtils } from "../utils/WebUtils.js";

class WebdavService extends FileService
{
  static PROXY_URI = "/bimrocket-server/api/proxy?url=";

  static roleToPrincipal =
  {
    "EVERYONE": { type: "all" },
    "AUTHENTICATED": { type: "authenticated" }
  };

  static xmlTagToPrivilege =
  {
    "read": "READ",
    "write": "WRITE",
    "read-acl": "READ_ACL",
    "write-acl": "WRITE_ACL"
  };

  static privilegeToXmlTag = {};

  static
  {
    for (let tag in this.xmlTagToPrivilege)
    {
      let privilege = this.xmlTagToPrivilege[tag];
      this.privilegeToXmlTag[privilege] = tag;
    }
  }

  constructor(parameters)
  {
    super(parameters);
  }

  getParameters()
  {
    const parameters = super.getParameters();
    parameters.useProxy = this.useProxy;
    return parameters;
  }

  setParameters(parameters)
  {
    super.setParameters(parameters);
    this.useProxy = parameters.useProxy || false;
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
      if (request.status === 200 || request.status === 204)
      {
        readyCallback(new Result(OK));
      }
      else
      {
        readyCallback(this.createError(request.responseText, request.status));
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

  move(sourcePath, destinationPath, readyCallback, progressCallback)
  {
    const OK = Result.OK;
    const ERROR = Result.ERROR;

    const url = this.getUrl(sourcePath);
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
          "Move operation failed", request.status));
      }
    };
    this.openRequest("MOVE", url, request);
    let destination = this.url + encodeURIComponent(destinationPath);
    request.setRequestHeader("Destination", destination);
    request.send();
  }

  copy(sourcePath, destinationPath, readyCallback, progressCallback)
  {
    const OK = Result.OK;
    const ERROR = Result.ERROR;

    const url = this.getUrl(sourcePath);
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
          "Copy operation failed", request.status));
      }
    };
    this.openRequest("COPY", url, request);
    request.setRequestHeader("Destination", this.url + destinationPath);
    request.send();
  }

  getACL(path, readyCallback)
  {
    const OK = Result.OK;
    const ERROR = Result.ERROR;

    try
    {
      const url = this.getUrl(path);
      const request = new XMLHttpRequest();

      request.onerror = () => readyCallback(new Result(ERROR, "Connection error"));
      request.onload = () =>
      {
        if (request.status === 200 || request.status === 207)
        {
          try
          {
            const acl = this.convertXMLToACL(request.response);
            readyCallback(new Result(OK, "ACL read", path, null, null, acl));
          }
          catch (error)
          {
            readyCallback(new Result(ERROR, `Failed to parse ACL: ${error}`));
          }
        }
        else
        {
          readyCallback(this.createError("ACL retrieval failed", request.status));
        }
      };

      this.openRequest("PROPFIND", url, request);
      request.setRequestHeader("Depth", "0");
      request.setRequestHeader("Content-Type", "application/xml; charset=utf-8");
      request.send(
        '<?xml version="1.0" encoding="utf-8" ?>' +
        '<d:propfind xmlns:d="DAV:">' +
        '  <d:prop>' +
        '    <d:acl/>' +
        '    <d:owner/>' +
        '  </d:prop>' +
        '</d:propfind>'
      );
    }
    catch (error)
    {
      readyCallback(new Result(ERROR, `ACL request failed: ${error}`, path));
    }
  }

  setACL(path, acl, readyCallback)
  {
    const OK = Result.OK;
    const ERROR = Result.ERROR;

    try
    {
      const aclXML = this.convertACLToXML(acl);
      const url = this.getUrl(path);
      const request = new XMLHttpRequest();

      request.onerror = () => readyCallback(new Result(ERROR, "Connection error"));
      request.onload = () =>
      {
        if (request.status === 200 || request.status === 201)
        {
          readyCallback(new Result(OK));
        }
        else
        {
          readyCallback(this.createError("ACL change failed", request.status));
        }
      };

      this.openRequest("ACL", url, request);
      request.setRequestHeader("Content-Type", "application/xml; charset=utf-8");
      request.send(aclXML);
    }
    catch (error)
    {
      readyCallback(new Result(ERROR, `ACL change failed: ${error}`, path));
    }
  }

  /* internal methods */

  openRequest(method, url, request)
  {
    if (this.useProxy)
    {
      url = WebdavService.PROXY_URI + url;
    }
    request.open(method, encodeURI(url), true);
    request.setRequestHeader("X-Requested-With", "XMLHttpRequest");

    const credentials = this.getCredentials();

    if (this.useProxy)
    {
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
      case 400: resultStatus = Result.BAD_REQUEST; break;
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

  convertXMLToACL(xmlString)
  {
    const DAV_NS = "DAV:";
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");

    const acl = new ACL();

    const aceElements = xmlDoc.getElementsByTagNameNS(DAV_NS, "ace");

    for (const aceElement of aceElements)
    {
      let role = null;

      const hrefElement = aceElement.getElementsByTagNameNS(DAV_NS, "href")[0];
      if (hrefElement)
      {
        role = hrefElement.textContent.trim();
      }
      else if (aceElement.getElementsByTagNameNS(DAV_NS, "all")[0])
      {
        role = "EVERYONE";
      }
      else if (aceElement.getElementsByTagNameNS(DAV_NS, "authenticated")[0])
      {
        role = "AUTHENTICATED";
      }
      if (!role) continue;

      const privilegeElements = aceElement.getElementsByTagNameNS(DAV_NS, "privilege");

      for (const privilegeElement of privilegeElements)
      {
        const privilegeNode = privilegeElement.firstElementChild;
        if (privilegeNode)
        {
          let privilegeTag = privilegeNode.localName;
          let privilege = this.mapXmlTagToPrivilege(privilegeTag);
          acl.grant(role, privilege);
        }
      }
    }
    return acl;
  }

  convertACLToXML(acl)
  {
    const roleToPrincipal = this.constructor.roleToPrincipal;

    let xml = `<?xml version="1.0" encoding="utf-8" ?>\n<D:acl xmlns:D="DAV:">\n`;

    for (const role in acl.roles)
    {
      const privileges = acl.getPrivileges(role);
      if (privileges.length === 0) continue;

      const principal = roleToPrincipal[role] || { type: "href", value: role };

      xml += `  <D:ace>\n`;
      if (principal.type === "href")
      {
        xml += `    <D:principal><D:href>${principal.value}</D:href></D:principal>\n`;
      }
      else
      {
        xml += `    <D:principal><D:${principal.type}/></D:principal>\n`;
      }
      xml += `    <D:grant>\n`;

      for (let privilege of privileges)
      {
        let privilegeTag = this.mapPrivilegeToXmlTag(privilege);
        xml += `      <D:privilege><D:${privilegeTag}/></D:privilege>\n`;
      }
      xml += `    </D:grant>\n`;
      xml += `  </D:ace>\n`;
    }

    xml += `</D:acl>`;

    return xml;
  }

  mapXmlTagToPrivilege(privilegeTag)
  {
    const privilege = this.constructor.xmlTagToPrivilege[privilegeTag];
    if (!privilege) throw "Unsupported privilege " + privilegeTag;
    return privilege;
  }

  mapPrivilegeToXmlTag(privilege)
  {
    const privilegeTag = this.constructor.privilegeToXmlTag[privilege];
    if (!privilegeTag) throw "Unsupported privilege " + privilege;
    return privilegeTag;
  }
}

ServiceManager.addClass(WebdavService);

export { WebdavService };