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

  getParameters()
  {
    return {
      name : this.name,
      description : this.description,
      url : this.url,
      username : this.username,
      password : this.password
    };
  }

  setParameters(parameters)
  {
    this.name = parameters.name;
    this.description = parameters.description;
    this.url = parameters.url;
    this.username = parameters.username;
    this.password = parameters.password;
  }
}

export { Service };