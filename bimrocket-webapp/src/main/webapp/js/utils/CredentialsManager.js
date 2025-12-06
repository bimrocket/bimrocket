/*
 * CredentialsManager.js
 *
 * @author realor
 */

const credentialsMap = {};

class CredentialsManager
{
  /**
   * Saves the credentials associated with an alias in memory.
   * This information will be lost when the application is restarted.
   *
   * @param {string} alias - The alias to associate with the credentials.
   * @param {string | object} username - the username or credentials object.
   * @param {string} password - the username password.
   */
  static setCredentials(alias, username, password)
  {
    let credentials;
    if (typeof username === "string")
    {
      credentials = { username : username, password : password };
    }
    else
    {
      credentials = username;
    }
    credentialsMap[alias] = credentials;
  }

  /**
   * Restores the credentials associated with an alias.
   *
   * @param {string} alias - the credential alias.
   * @param {boolean} create - force the creation of credentials if they do not exist.
   * @returns {object} the credentials object associated with the alias.
   */
  static getCredentials(alias, create = false)
  {
    let credentials = credentialsMap[alias];
    if (credentials) return credentials;

    if (create)
    {
      credentials = { username : null, password : null };
      credentialsMap[alias] = credentials;
      return credentials;
    }
    return null;
  }
}

export { CredentialsManager };
