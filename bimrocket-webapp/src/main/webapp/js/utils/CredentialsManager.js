/*
 * CredentialsManager.js
 *
 * @author realor
 */

class CredentialsManager
{
  static KEY = "bimrocket.credentials.";
  static map = {};

  static setCredentials(alias, username, password)
  {
    const credentials = { username : username, password : password };
    this.map[alias] = credentials;
  }

  static getCredentials(alias, create = false)
  {
    let credentials = this.map[alias];
    if (credentials) return credentials;

    const json = window.localStorage.getItem(this.KEY + alias);
    if (json)
    {
      credentials = JSON.parse(json);
    }
    else if (create)
    {
      credentials = { username : null, password : null};
    }
    else return null;

    this.map[alias] = credentials;
    return credentials;
  }

  static saveCredentials(alias)
  {
    let credentials = this.map[alias];

    if (credentials)
    {
      window.localStorage.setItem(this.KEY + alias, JSON.stringify(credentials));
    }
  }
}

export { CredentialsManager };

