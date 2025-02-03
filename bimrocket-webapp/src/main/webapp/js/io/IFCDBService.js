/*
 * IFCDBService.js
 *
 * @author realor
 */

import { Service } from "./Service.js";
import { ServiceManager } from "./ServiceManager.js";
import { WebUtils } from "../utils/WebUtils.js";

class IFCDBService extends Service
{
  constructor(parameters)
  {
    super(parameters);
  }

  async execute(command)
  {
    const response = await this.invoke("POST", "", "application/json", JSON.stringify(command));
    return await response.text();
  }

  async getModel(modelId)
  {
    const response = await this.invoke("GET", modelId);
    return await response.text();
  }

  async putModel(modelId, data)
  {
    const response = await this.invoke("PUT", modelId, "application/x-step", data);
    return await response.json();
  }

  async deleteModel(modelId)
  {
    const response = await this.invoke("DELETE", modelId);
    return await response.json();
  }

  async invoke(method, path = "", contentType, body)
  {
    const username = this.username;
    const password = this.password;
    let url = this.url;

    if (!url.endsWith("/")) url += "/";
    url += path;

    const fetchOptions = {
      method: method,
      headers: {}
    };

    if (contentType)
    {
      fetchOptions.headers["Content-Type"] = contentType;
    }

    if (body)
    {
      fetchOptions.body = body;
    }

    const credentials = this.getCredentials();

    WebUtils.setBasicAuthorization(fetchOptions.headers,
      credentials.username, credentials.password);

    const response = await fetch(url, fetchOptions);
    if (!response.ok) throw await response.json();

    return response;
  }
}

ServiceManager.addClass(IFCDBService);

export { IFCDBService };