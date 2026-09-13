/**
 * SecurityService.js
 *
 * @author nuriaescudei2cat
 * @author alexis-i2cat
 * @author realor
 */

import { Service } from "platform/io/Service.js";
import { RestServiceClient } from "platform/io/RestServiceClient.js";
import { ServiceManager } from "platform/io/ServiceManager.js";

const headers = { "Content-Type": "application/json" };

class SecurityService extends Service
{
  constructor(parameters)
  {
    super(parameters);
    this.client = new RestServiceClient(this);
  }

  getRoles(odataFilter, odataOrderBy, onCompleted, onError)
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

    this.client.call("GET", "roles" + query,
      { onCompleted, onError });
  }

  getRole(roleId, onCompleted, onError)
  {
    this.client.call("GET", "roles/" + roleId,
      { onCompleted, onError });
  }

  createRole(role, onCompleted, onError)
  {
    const body = JSON.stringify(role);

    this.client.call("POST", "roles",
      { headers, body, onCompleted, onError });
  }

  updateRole(role, onCompleted, onError)
  {
    const body = JSON.stringify(role);

    this.client.call("PUT", "roles",
      { headers, body, onCompleted, onError });
  }

  deleteRole(roleId, onCompleted, onError)
  {
    this.client.call("DELETE",
      "roles/" + roleId,
      { onCompleted, onError });
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

    this.client.call("GET", "users" + query,
      { onCompleted, onError });
  }

  getUser(userId, onCompleted, onError)
  {
    this.client.call("GET", "users/" + userId,
      { onCompleted, onError });
  }

  getCurrentUser(onCompleted, onError)
  {
    return "???";
  }

  createUser(user, onCompleted, onError)
  {
    const body = JSON.stringify(user);

    this.client.call("POST", "users",
      { headers, body, onCompleted, onError });
  }

  updateUser(user, onCompleted, onError)
  {
    const body = JSON.stringify(user);

    this.client.call("PUT", "users",
      { headers, body, onCompleted, onError });
  }

  deleteUser(userId, onCompleted, onError)
  {
    this.client.call("DELETE", "users/" + userId,
      { onCompleted, onError });
  }

  login(username, password, onCompleted, onError)
  {
    const isLocalServer = this.url.startsWith("/") || this.url === "";

    const request =
    {
      user: username,
      password: password,
      generate_cookie: isLocalServer
    };

    const body = JSON.stringify(request);

    this.client.call("POST", "login",
      { headers, body, onCompleted, onError });
  }

  logout(onCompleted, onError)
  {
    this.client.call("GET", "logout",
      { onCompleted, onError });
  }

  getOAuth2Providers(onCompleted, onError)
  {
    this.client.call("GET", "oauth2/providers",
      { onCompleted, onError });
  }
}

ServiceManager.addClass(SecurityService);

export { SecurityService };