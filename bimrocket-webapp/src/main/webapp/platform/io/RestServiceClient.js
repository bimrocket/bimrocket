/**
 * RestServiceClient.js
 *
 * @author realor
 */

import { ServerSession } from "platform/io/ServerSession.js";
import { ServiceError } from "platform/io/Service.js";

class RestServiceClient
{
  constructor(service)
  {
    this.service = service;
  }

  getTargetUrl(path)
  {
    let url = this.service.url;

    if (url.endsWith("/"))
    {
      url = url.substring(0, url.length - 1);
    }

    if (path)
    {
      if (path.startsWith("/")) url += path;
      else url += "/" + path;
    }
    return encodeURI(url);
  }

  /**
   *
   * @param {string} method - the HTTP method of the call
   * @param {string} path - the relative path to the service URL
   * @param {Object} options - the fetch options
   * @param {Object} [options.headers] - the HTTP headers
   * @param {string|ArrayBuffer} [options.body] - the HTTP body
   * @param {function} [options.onCompleted] - function(data, response)
   * @param {function} [options.onError] - function(error, response)
   * @param {function} [options.onProgress] - function(progress)
   * @param {string} [options.dataType] - the expected result type:
   *   auto, text, json, xml, reader or arraybuffer.
   * @returns {object} result - the result returned by the service
   */
  async call(method, path = "", options = {})
  {
    const service = this.service;
    const headers = { ...options.headers };
    const { body, onCompleted, onError, onProgress } = options;
    const dataType = options.dataType || "auto";

    const fetchOptions =
    {
      method,
      headers
    };

    try
    {
      // Inject authorization header and credentials as needed
      const serverSession = ServerSession.getSession(service);
      serverSession.setFetchOptions(fetchOptions);

      if (body)
      {
        fetchOptions.body = body;
      }

      const targetUrl = this.getTargetUrl(path);
      const response = await fetch(targetUrl, fetchOptions);

      if (response.ok)
      {
        let data;
        if (onProgress)
        {
          data = await this.readWithProgress(response, dataType, onProgress);
        }
        else
        {
          data = await this.readResponse(response, dataType);
        }
        onCompleted?.(data, response);
        return data;
      }
      else // error
      {
        const responseBody = await this.readResponse(response, "auto");

        // get ServiceError
        const error = serverSession.getServiceError(response.status, responseBody);

        if (onError) onError(error, response);
        else throw error;
      }
    }
    catch (ex)
    {
      const error = new ServiceError(ServiceError.UNKNOWN_ERROR, ex.message);
      if (onError) onError(ex);
      else throw ex;
    }
  }

  async readResponse(response, dataType)
  {
    if (dataType === "auto")
    {
      dataType  = this.getDataType(response);
    }

    if (dataType === "json")
    {
      return await response.json();
    }
    else if (dataType === "xml")
    {
      const text = await response.text();
      const parser = new DOMParser();
      return parser.parseFromString(text, "application/xml");
    }
    else if (dataType === "text")
    {
      return await response.text();
    }
    else if (dataType === "reader")
    {
      return response.body.getReader();
    }
    else
    {
      return await response.arrayBuffer();
    }
  }

  async readWithProgress(response, dataType, onProgress)
  {
    const contentLength = response.headers.get("Content-Length");
    const total = contentLength ? parseInt(contentLength, 10) : null;

    const reader = response.body.getReader();
    let received = 0;
    const chunks = [];

    while (true)
    {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      received += value.byteLength;

      const percent = total ? Math.round((received / total) * 100) : undefined;
      onProgress?.({ received, total, percent });
    }

    const allChunks = new Uint8Array(received);
    let position = 0;
    for (const chunk of chunks)
    {
      allChunks.set(chunk, position);
      position += chunk.byteLength;
    }

    if (dataType === "auto")
    {
      dataType  = this.getDataType(response);
    }

    if (dataType === "json")
    {
      const text = new TextDecoder().decode(allChunks);
      return JSON.parse(text);
    }
    else if (dataType === "xml")
    {
      const text = new TextDecoder().decode(allChunks);
      const parser = new DOMParser();
      return parser.parseFromString(text, "application/xml");
    }
    else if (dataType === "text")
    {
      return new TextDecoder().decode(allChunks);
    }
    else
    {
      return allChunks.buffer;
    }
  }

  getDataType(response)
  {
    let dataType;
    const contentType = response.headers.get("Content-Type");
    if (contentType?.includes("application/json"))
    {
      dataType = "json";
    }
    else if (contentType?.includes("xml"))
    {
      dataType = "xml";
    }
    else if (contentType?.includes("text/"))
    {
      dataType = "text";
    }
    else
    {
      dataType = "arraybuffer";
    }
    return dataType;
  }
}

export { RestServiceClient };
