/**
 * Service.js
 *
 * @author realor
 */

class Service
{
  static type = "Service";

  constructor(name, description = null,
    url = null, username = null, password = null)
  {
    this.name = name;
    this.description = description;
    this.url = url;
    this.username = username;
    this.password = password;
  }

  getParameters()
  {
    return this;
  }

  setParameters(parameters)
  {
    Object.assign(this, parameters);
  }
}

export { Service };