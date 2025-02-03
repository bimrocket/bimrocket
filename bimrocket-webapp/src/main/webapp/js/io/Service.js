/**
 * Service.js
 *
 * @author realor
 */

import { CredentialsManager } from "../utils/CredentialsManager.js";

class Service
{
  constructor(parameters)
  {
    if (typeof parameters === "object")
    {
      this.setParameters(parameters);
    }
  }

  getParameters()
  {
    return {
      name : this.name,
      description : this.description,
      url : this.url,
      credentialsAlias : this.credentialsAlias || null,
      credentials : this.credentials || null
    };
  }

  setParameters(parameters)
  {
    this.name = parameters.name;
    this.description = parameters.description;
    this.url = parameters.url;
    this.credentialsAlias = parameters.credentialsAlias || null;
    if (parameters.credentials)
    {
      this.setCredentials(
        parameters.credentials.username || null,
        parameters.credentials.password || null);
    }
  }

  getCredentials()
  {
    return this.credentialsAlias ?
      CredentialsManager.getCredentials(this.credentialsAlias, true) :
      this.credentials;
  }

  setCredentials(username, password)
  {
    if (this.credentialsAlias)
    {
      CredentialsManager.setCredentials(this.credentialsAlias, username, password);
      this.credentials = null;
    }
    else
    {
      this.credentialsAlias = null;
      this.credentials = {
        username : username || null,
        password: password || null
      };
    }
  }
}

export { Service };