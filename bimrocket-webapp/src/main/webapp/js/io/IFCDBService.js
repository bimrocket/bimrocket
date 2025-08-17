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

  async getModels(odataFilter, odataOrderBy)
  {
    let query = "";
    if (odataFilter || odataOrderBy)
    {
      query = "?";
      if (odataFilter)
      {
        query += "$filter=" + odataFilter;
      }
      if (odataOrderBy)
      {
        if (!query.endsWith("?")) query += "&";
        query += "$orderBy=" + odataOrderBy;
      }
    }
    const response = await this.invoke("GET", query);
    return await response.json();
  }

  async getModelVersions(modelId)
  {
    const response = await this.invoke("GET", modelId + "/versions");
    return await response.json();
  }

  async downloadModel(modelId, version = 0)
  {
    const response = await this.invoke("GET", modelId + "?version=" + version);
    return await response.text();
  }

  async uploadModel(data)
  {
    const response = await this.invoke("POST", "",
      {"Content-Type" : "application/x-step"}, data);
    return await response.json();
  }

  async updateModel(model)
  {
    const response = await this.invoke("PUT", "",
      {"Content-Type" : "application/json"}, JSON.stringify(model));
    return await response.json();
  }

  async deleteModel(modelId, version = 0)
  {
    const response = await this.invoke("DELETE", modelId + "?version=" + version);
    return await response.json();
  }

  async execute(command)
  {
    const response = await this.invoke("POST", "execute",
      {"Content-Type" : "application/json"}, JSON.stringify(command));
    return await response.text();
  }

  async invoke(method, path = "", headers = {}, body)
  {
    const username = this.username;
    const password = this.password;
    let url = this.url;

    if (!url.endsWith("/")) url += "/";
    url += path;

    const fetchOptions = {
      method : method,
      headers : headers
    };

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