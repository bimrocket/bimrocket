/**
 * Service.js
 *
 * @author realor
 */

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
   * name, description, url, serverType, ...
   */
  getParameters()
  {
    return {
      name : this.name,
      description : this.description,
      url : this.url,
      serverType : this.serverType
    };
  }

  /**
   * Sets the persistent service parameters.
   *
   * @param {object} parameters - the service paramaters to set that contains
   * these properties: name, description, url, serverType, ...
   */
  setParameters(parameters)
  {
    this.name = parameters.name;
    this.description = parameters.description;
    this.url = parameters.url;
    this.serverType = parameters.serverType;
  }
}

class ServiceError
{
  static INVALID_CREDENTIALS = 1;
  static FORBIDDEN = 2;
  static BAD_REQUEST = 3;
  static NOT_FOUND = 4;
  static INTERNAL_ERROR = 5;
  static NOT_IMPLEMENTED = 6;
  static NETWORK_ERROR = 7;
  static UNKNOWN_ERROR = 8;

  constructor(code, message = "", detail = "")
  {
    this.code = code || ServiceError.UNKNOWN_ERROR;
    this.message = message;
    this.detail = detail;
  }
}

export { Service, ServiceError };