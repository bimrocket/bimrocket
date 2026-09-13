/*
 * WebdavService.js
 *
 * @author realor
 */

import { IOManager } from "platform/io/IOManager.js";
import { FileService, Metadata, Result, ACL } from "platform/io/FileService.js";
import { ServiceError } from "platform/io/Service.js";
import { RestServiceClient } from "platform/io/RestServiceClient.js";
import { ServiceManager } from "platform/io/ServiceManager.js";

const UNKNOWN_ERROR = ServiceError.UNKNOWN_ERROR;

const { COLLECTION, FILE } = Metadata;

class WebdavService extends FileService
{
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
    this.client = new RestServiceClient(this);
    if (this.serverType === undefined) this.serverType = "bimrocket";
  }

  getParameters()
  {
    const parameters = super.getParameters();
    parameters.serverType = this.serverType;
    return parameters;
  }

  setParameters(parameters)
  {
    super.setParameters(parameters);
    this.serverType = parameters.serverType;
  }

  find(path, options, onCompleted)
  {
    let url = this.client.getTargetUrl(path);

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
    baseUri = decodeURIComponent(baseUri);

    const headers = { "depth": options?.depth || "1" };

    this.client.call("PROPFIND", path,
      {
        headers,
        onCompleted : (xml) =>
        {
          try
          {
            // OK
            let multiNode = xml.childNodes[0];
            let responseNodes = multiNode.childNodes;
            let metadata = new Metadata();
            let entries = null;
            for (let responseNode of responseNodes)
            {
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

                hrefValue = decodeURIComponent(hrefValue);

                let fileName = hrefValue.substring(baseUri.length);
                let isCollectionNode = responseNode.querySelector(
                  "propstat prop resourcetype collection") !== null;
                let contentLengthNode = responseNode.querySelector(
                  "propstat prop getcontentlength");
                let lastModifiedNode = responseNode.querySelector(
                  "propstat prop getlastmodified");

                let fileSize = contentLengthNode ?
                  parseInt(contentLengthNode.textContent) : 0;
                let lastModified = lastModifiedNode ? // HTTP-Date
                  Date.parse(lastModifiedNode.textContent) : 0;

                if (fileName.indexOf("/") === 0) fileName = fileName.substring(1);

                if (fileName.length === 0) // filename is the requested resource
                {
                  let index = hrefValue.lastIndexOf("/");
                  metadata.name = hrefValue.substring(index + 1);
                  metadata.description = metadata.name;
                  metadata.type = isCollectionNode ? COLLECTION : FILE;
                  metadata.size = fileSize;
                  metadata.lastModified = lastModified;
                }
                else // filename is a child resource
                {
                  if (!entries) entries = [];
                  let entry = new Metadata(fileName, fileName,
                    isCollectionNode ? COLLECTION : FILE, fileSize, lastModified);
                  entries.push(entry);
                }
              }
            }

            onCompleted?.(new Result({ path, metadata, entries }));
          }
          catch (ex)
          {
            const error = new ServiceError(UNKNOWN_ERROR, String(ex));
            onCompleted?.(new Result({ error }));
          }
        },
        onError : error =>
        {
          // ERROR
          onCompleted?.(this.createError("Can't open", error));
        }
      });
  }

  read(path, onCompleted, onProgress)
  {
    const metadata = new Metadata();
    const index = path.lastIndexOf("/");
    metadata.name = index === -1 ? path : path.substring(index + 1);
    metadata.type = FILE;

    let formatInfo = IOManager.getFormatInfo(path);
    let dataType = formatInfo?.dataType || "arraybuffer";

    this.client.call("GET", path,
      {
        onCompleted : (data, response) =>
        {
          onProgress?.({ progress : 100, message : "Download completed." });
          metadata.size = parseInt(response.headers.get("Content-Length"));
          onCompleted?.(new Result({ path, metadata, data }));
        },
        onError : error =>
        {
          onCompleted?.(this.createError("Can't open", error));
        },
        onProgress : (progress) =>
        {
          const message = "Downloading file...";
          onProgress?.({ progress: progress.percent, message });
        },
        dataType
      });
  }

  write(path, data, onCompleted, onProgress)
  {
    this.client.call("PUT", path,
      {
        body : data,
        onCompleted : () => { onCompleted?.(new Result()); },
        onError : error =>
        {
          onCompleted?.(this.createError("Write failed", error));
        }
      });
  }

  remove(path, onCompleted, onProgress)
  {
    this.client.call("DELETE", path,
      {
        onCompleted : () => { onCompleted?.(new Result()); },
        onError : error =>
        {
          onCompleted?.(this.createError("Remove failed", error));
        }
      });
  }

  makeCollection(path, onCompleted, onProgress)
  {
    this.client.call("MKCOL", path,
      {
        onCompleted : () => { onCompleted?.(new Result()); },
        onError : error =>
        {
          onCompleted?.(this.createError("Folder creation failed", error));
        }
      });
  }

  move(sourcePath, destinationPath, onCompleted)
  {
    const destination = this.client.getTargetUrl(destinationPath);
    const headers = { destination };

    this.client.call("MOVE", sourcePath,
      {
        headers,
        onCompleted : () => { onCompleted?.(new Result()); },
        onError : error =>
        {
          onCompleted?.(this.createError("Move operation failed", error));
        }
      });
  }

  copy(sourcePath, destinationPath, onCompleted, onProgress)
  {
    const destination = this.client.getTargetUrl(destinationPath);
    const headers = { destination };

    this.client.call("COPY", sourcePath,
      {
        headers,
        onCompleted : () => { onCompleted?.(new Result()); },
        onError : error =>
        {
          onCompleted?.(this.createError("Copy operation failed", error));
        }
      });
  }

  getACL(path, onCompleted)
  {
    const headers =
    {
      "Depth": "0",
      "Content-Type": "application/xml; charset=utf-8"
    };

    const body = `<?xml version="1.0" encoding="utf-8" ?>
      <d:propfind xmlns:d="DAV:">
        <d:prop>
          <d:acl/>
          <d:owner/>
        </d:prop>
      </d:propfind>`;

    this.client.call("PROPFIND", path,
      {
        headers,
        body,
        onCompleted : (xml) =>
        {
          try
          {
            const data = this.convertXMLToACL(xml);
            onCompleted?.(new Result({ message : "ACL read", path, data }));
          }
          catch (ex)
          {
            const error =
              new ServiceError(UNKNOWN_ERROR, `Failed to parse ACL: ${ex}`);
            onCompleted?.(new Result({ error }));
          }
        },
        onError : error =>
        {
          error.message = "ACL retrieval failed: " + error.message;
          onCompleted?.({ error });
        },
        dataType : "text"
      });
  }

  setACL(path, acl, onCompleted)
  {
    try
    {
      const headers = { "Content-Type": "application/xml; charset=utf-8" };
      const body = this.convertACLToXML(acl);

      this.client.call("ACL", path,
      {
        headers,
        body,
        onCompleted : xml =>
        {
          onCompleted?.(new Result({ message: "ACL updated" }));
        },
        onError : error =>
        {
          onCompleted?.(this.createError("ACL change failed", error));
        }
      });
    }
    catch (ex)
    {
      const error = new ServiceError(UNKNOWN_ERROR, `ACL change failed: ${ex}`);
      onCompleted?.(new Result({ error, path }));
    }
  }

  /* internal methods */

  createError(message, error)
  {
    error.message = error.message ? message + ": " + error.message : message;
    return new Result({ error });
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