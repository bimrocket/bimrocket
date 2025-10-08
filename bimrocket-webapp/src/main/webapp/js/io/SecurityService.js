/**
 * SecurityService.js
 *
 * @author i2CAT
 */

import { Service } from "./Service.js";
import { ServiceManager } from "./ServiceManager.js";
import { WebUtils } from "../utils/WebUtils.js";

class SecurityService extends Service
{
  constructor(parameters)
  {
    super(parameters);
  }

  getRoles(onCompleted, onError)
  {
    this.invoke("GET", "roles", null, onCompleted, onError);
  }

  getRole(roleId, onCompleted, onError)
  {
    this.invoke("GET", "roles/" + roleId, null, onCompleted, onError);
  }

  createRole(role, onCompleted, onError)
  {
    this.invoke("POST", "roles", role, onCompleted, onError);
  }

  updateRole(role, onCompleted, onError)
  {
    this.invoke("PUT", "roles/", role, onCompleted, onError);
  }

  deleteRole(roleId, onCompleted, onError)
  {
    this.invoke("DELETE", "roles/" + roleId, null, onCompleted, onError);
  }

  getUsers(odataFilter, odataOrderBy, onCompleted, onError)
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
    
    this.invoke("GET", "users" + query, null, onCompleted, onError);
  }

  getUser(userId, onCompleted, onError)
  {
    this.invoke("GET", "users/" + userId, null, onCompleted, onError);
  }

  createUser(user, onCompleted, onError)
  {
    this.invoke("POST", "users", user, onCompleted, onError);
  }

  updateUser(userId, user, onCompleted, onError)
  {
    this.invoke("PUT", "users/", user, onCompleted, onError);
  }

  deleteUser(userId, onCompleted, onError)
  {
    this.invoke("DELETE", "users/" + userId, null, onCompleted, onError);
  }

  invoke(method, path, data, onCompleted, onError)
  {
    const request = new XMLHttpRequest();
    if (onError)
    {
      request.onerror = error =>
      {
        onError({code: 0, message: "Connection error"});
      };
    }

    if (onCompleted) request.onload = () =>
    {
      if (request.status === 200 || request.status === 201)
      {
        if (request.response)
        {
          try
          {
            onCompleted(JSON.parse(request.responseText));
          }
          catch (ex)
          {
            if (onError) onError({code: 0, message: ex});
          }
        }
        else
        {
          onCompleted();
        }
      }
      else
      {
        let error;
        try
        {
          error = JSON.parse(request.responseText);
        }
        catch (ex)
        {
          error = {code: request.status, message: "Error " + request.status};
        }
        if (onError) onError(error);
      }
    };

    request.open(method, this.url + "/security/" + path);
    request.setRequestHeader("Accept", "application/json");
    
    if (data)
    {
      request.setRequestHeader("Content-Type", "application/json");
    }

    const credentials = this.getCredentials();

    WebUtils.setBasicAuthorization(request,
      credentials.username, credentials.password);

    if (data)
    {
      request.send(JSON.stringify(data));
    }
    else
    {
      request.send();
    }
  }
}

ServiceManager.addClass(SecurityService);

export { SecurityService };