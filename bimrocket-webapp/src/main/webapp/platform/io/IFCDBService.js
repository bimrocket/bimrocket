/*
 * IFCDBService.js
 *
 * @author realor
 */

import { Service } from "platform/io/Service.js";
import { RestServiceClient } from "platform/io/RestServiceClient.js";
import { ServiceManager } from "platform/io/ServiceManager.js";

class IFCDBService extends Service
{
  constructor(parameters)
  {
    super(parameters);
    this.client = new RestServiceClient(this);
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
    return await this.client.call("GET", query);
  }

  async getModelVersions(modelId)
  {
    return await this.client.call("GET", modelId + "/versions");
  }

  async downloadModel(modelId, version = 0)
  {
    return await this.client.call("GET",
      modelId + "?version=" + version,
      { dataType : "text" });
  }

  async uploadModel(data)
  {
    return await this.client.call("POST", "",
    {
      headers: { "Content-Type": "application/x-step" },
      body: data
    });
  }

  async updateModel(model)
  {
    return await this.client.call("PUT", "",
    {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(model)
    });
  }

  async deleteModel(modelId, version = 0)
  {
    return await this.client.call("DELETE", modelId + "?version=" + version);
  }

  async execute(command)
  {
    return await this.client.call("POST", "execute",
    {
      headers : { "Content-Type": "application/json" },
      body : JSON.stringify(command),
      dataType : "text"
    });
  }
}

ServiceManager.addClass(IFCDBService);

export { IFCDBService };