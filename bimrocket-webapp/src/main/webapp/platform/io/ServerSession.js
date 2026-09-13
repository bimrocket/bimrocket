/**
 * ServerSession.js
 *
 * @author realor
 */

import { SecurityService } from "platform/io/SecurityService.js";
import { ServiceError } from "platform/io/Service.js";
import { WebUtils } from "platform/utils/WebUtils.js";

const {
  INVALID_CREDENTIALS,
  FORBIDDEN,
  BAD_REQUEST,
  NOT_FOUND,
  INTERNAL_ERROR,
  NOT_IMPLEMENTED,
  UNKNOWN_ERROR
} = ServiceError;


/**
 * Represents a session of a specific type of server.
 * It also holds a registry of active server sessions.
 *
 * @class
 */
class ServerSession
{
  static sessions = new Map();
  static classes = {};

  constructor(baseUrl)
  {
    this.baseUrl = baseUrl;
  }

  /**
   * Log in to the server with the given username and password.
   *
   * @param {string} username - the username to log in with
   * @param {string} password - the password to log in with
   * @param {function} onCompleted - called when login completes
   * @param {function} onError - called when login fails
   */
  login(username, password, onCompleted, onError)
  {
    onCompleted?.();
  }

  /**
   * Closes the server session.
   *
   * @param {function} onCompleted - called when logout completes
   * @param {function} onError - called when logout fails
   */
  logout(onCompleted, onError)
  {
    onCompleted?.();
  }

  /**
   * Retrieves the OAuth2 providers supported by this server.
   *
   * @param {function} onCompleted - called when retrieval completes
   * @param {function} onError - called when retrieval fails
   */
  getOAuth2Providers(onCompleted, onError)
  {
    onCompleted?.([]);
  }

  /**
   * Gets the user who is currently logged into the server.
   *
   * @param {function} onCompleted - called when operation completes
   * @param {function} onError - called when operation completes
   */
  getUsername(onCompleted, onError)
  {
    onCompleted?.("anonymous");
  }

  /**
   * Sets the fetch options to make a request to this server.
   * This methods must inject the required fetch headers.
   *
   * @param {Object} fetchOptions - the options to use in the fetch operation
   */
  setFetchOptions(fetchOptions)
  {
  }

  /**
   * Creates a ServiceError object from the http status and the
   * server response.
   *
   * @param {number} status - the http status
   * @param {Object} responseBody - an object that represents the body of the
   *  server's response
   *
   * @returns {Object} the ServiceError { code: number, message: string }
   */
  getServiceError(status, responseBody)
  {
    let code;
    switch (status)
    {
      case 400:
      case 405:
        code = BAD_REQUEST;
        break;
      case 401:
        code = INVALID_CREDENTIALS;
        break;
      case 403:
        code = FORBIDDEN;
        break;
      case 404:
        code = NOT_FOUND;
        break;
      case 500:
        code = INTERNAL_ERROR;
        break;
      case 501:
        code = NOT_IMPLEMENTED;
        break;
      default:
        code = UNKNOWN_ERROR;
        break;
    }
    return new ServiceError(code);
  }

  /**
   * Determine the action to be taken based on the error that has occurred.
   *
   * @param {ServiceError} error - the error that has occurred
   * @param {function} retry - called when the error was fixed (token renewal)
   * @param {function} authenticate - called when user authentication is required
   * @param {function} showError - called to show this error to the user
   */
  handleError(error, retry, authenticate, showError)
  {
    showError?.();
  }

  /**
   * Gets the server base url from the given service url.
   *
   * @param {string} url - the service url
   * @returns {string} - the server base url.
   */
  static getBaseUrl(url)
  {
    return url;
  }

  /**
   * Gets the the session associated with the specified service.
   *
   * @param {Service} service
   * @param {boolean} create - when true, creates the session if it does not exists
   * @returns {ServerSession} - the session associated with the given service
   */
  static getSession(service, create = true)
  {
    const sessionClass = this.classes[service.serverType] ||
          BimrocketServerSession;
    const baseUrl = sessionClass.getBaseUrl(service.url);
    const key = sessionClass.serverType + ":" + baseUrl;

    let session = this.sessions.get(key);
    if (!session && create)
    {
      session = new sessionClass(baseUrl);
      this.sessions.set(key, session);
    }
    return session;
  }

  /**
   * Get all active server sessions.
   *
   * @returns {ServerSession[]} array of ServerSessions
   */
  static getSessions()
  {
    return [...this.sessions.values()];
  }

  /**
   * Adds a new ServerSession class.
   *
   * @param {class} cls - the ServerSession class
   */
  static addClass(cls)
  {
    this.classes[cls.serverType] = cls;
  }

  /**
   * Returns the name of all available ServerSession classes.
   *
   * @returns {string[]} array of ServerSession class names
   */
  static getClassNames()
  {
    return Object.keys(this.classes);
  }
}

/**
 * ServerSession for Bimrocket servers.
 * It authenticates the user through the SecurityService.
 *
 * @class
 */
class BimrocketServerSession extends ServerSession
{
  static serverType = "bimrocket";

  constructor(baseUrl)
  {
    super(baseUrl);
    this.username = null;
    this.authorization = null;
  }

  login(username, password, onCompleted, onError)
  {
    const processResult = (result) =>
    {
      this.username = username;
      this.authorization = result.token ? "Bearer " + result.token : null;
      onCompleted?.();
    };

    this.getSecurityService().login(username, password, processResult, onError);
  }

  logout(onCompleted, onError)
  {
    const processResult = () =>
    {
      this.username = null;
      this.authorization = null;
      onCompleted?.();
    };

    this.getSecurityService().logout(processResult, onError);
  }

  getOAuth2Providers(onCompleted, onError)
  {
    const baseUrl = this.baseUrl;
    const processProviders = (providers) =>
    {
      providers.forEach(provider =>
        provider.authUrl = `${baseUrl}/api/security/oauth2/login/${provider.name}`);
      onCompleted?.(providers);
    };

    this.getSecurityService().getOAuth2Providers(processProviders, onError);
  }

  getUsername(onCompleted, onError)
  {
    onCompleted?.(this.username || "anonymous");
  }

  setFetchOptions(fetchOptions)
  {
    const headers = fetchOptions.headers;

    headers["X-Requested-With"] = "Fetch"; // always send Fetch.

    if (this.authorization)
    {
      // send Bearer authorization if present
      fetchOptions.credentials = "omit";
      headers["Authorization"] = this.authorization;
    }
    else
    {
      if (this.username)
      {
        // send session cookie
        fetchOptions.credentials = "include";
      }
    }
  }

  getServiceError(status, responseBody)
  {
    const error = super.getServiceError(status, responseBody);
    error.message = responseBody.message || WebUtils.getHttpStatusMessage(status);

    return error;
  }

  handleError(error, retry, authenticate, showError)
  {
    if (error.code === INVALID_CREDENTIALS ||
        error.code === FORBIDDEN)
    {
      authenticate?.();
    }
    else
    {
      showError?.();
    }
  }

  getSecurityService()
  {
    return new SecurityService({ url: this.baseUrl + "/api/security" });
  }

  static getBaseUrl(url)
  {
		let index = url.indexOf("/api");
		let baseUrl = index !== -1 ? url.substring(0, index) : url;
    return baseUrl;
  }
}

/**
 *  ServerSession for generic servers
 *  It delegates authentication to the browser.
 *
 * @class
 */
class GenericServerSession extends ServerSession
{
  static serverType = "generic";

  constructor(baseUrl)
  {
    super(baseUrl);
  }

  getServiceError(status, responseBody)
  {
    const error = super.getServiceError(status, responseBody);
    error.message = WebUtils.getHttpStatusMessage(status);

    return error;
  }
}

ServerSession.addClass(BimrocketServerSession);
ServerSession.addClass(GenericServerSession);

export { ServerSession };