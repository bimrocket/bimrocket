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

  /**
   * Gets the persistent service parameters.
   *
   * @returns {object} the service paramaters that contains these properties:
   * name, description, url and credentialsAlias
   */
  getParameters()
  {
    return {
      name : this.name,
      description : this.description,
      url : this.url,
      credentialsAlias : this.credentialsAlias || null
    };
  }

  /**
   * Sets the persistent service parameters.
   *
   * @param {object} parameters - the service paramaters to set that contains
   * these properties: name, description, url and credentialsAlias
   */
  setParameters(parameters)
  {
    this.name = parameters.name;
    this.description = parameters.description;
    this.url = parameters.url;
    this.credentialsAlias = parameters.credentialsAlias || null;
  }

  /**
   * Gets the current service credentials.
   *
   * @returns {object} the current object credentials.
   */
  getCredentials()
  {
    if (this.credentialsAlias)
    {
      return CredentialsManager.getCredentials(this.credentialsAlias, true);
    }
    else
    {
      if (!this.credentials)
      {
        this.credentials = { username : null, password : null };
      }
      return this.credentials;
    }
  }

  /**
   * Sets the current service credentials.
   *
   * @param {string | object} username - the username or credentials object
   * @param {string} password - the user password
   */
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
      if (typeof username === "string")
      {
        this.credentials = {
          username : username || null,
          password: password || null
        };
      }
      else
      {
        this.credentials = username;
      }
    }
  }
}

export { Service };