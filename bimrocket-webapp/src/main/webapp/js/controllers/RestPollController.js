/*
 * RestPollController.js
 *
 * @author realor
 */

import { Controller } from "./Controller.js";

class RestPollController extends Controller
{
  constructor(object, name)
  {
    super(object, name);

    this.url = "";
    this.method = "GET";
    this.authorizationHeader = ""; // Ex: Authorization : Basic ....
    this.pollInterval = 10; // seconds
    this.output = "{}"; // JSON string
    this.autoStart = false;
    this._timeoutId = null;
  }

  onStart()
  {
    if (this._timeoutId === null)
    {
      this._timeoutId = setTimeout(() => this.poll(), 0);
    }
  }

  onStop()
  {
    if (this._timeoutId !== null)
    {
      clearInterval(this._timeoutId);
      this._timeoutId = null;
    }
  }

  poll()
  {
    this.connect();

    if (this.isStarted())
    {
      this._timeoutId = setTimeout(() => this.poll(), this.pollInterval * 1000);
    }
    else
    {
      this._timeoutId = null;
    }
  }

  connect()
  {
    const headers = new Headers();

    const parameters = {
      method: this.method,
      headers: headers,
      mode: "cors",
      cache: "default"
    };

    const authorizationHeader = this.authorizationHeader;
    if (typeof authorizationHeader === "string"
        && authorizationHeader.length > 0)
    {
      let index = authorizationHeader.indexOf(":");
      if (index !== -1)
      {
        let name = authorizationHeader.substring(0, index).trim();
        let value = authorizationHeader.substring(index + 1).trim();
        headers.set(name, value);
      }
    }

    const request = new Request(this.url, parameters);

    fetch(request)
      .then(response => response.json()).then(json =>
        {
          console.info("RestPollController", json);
          this.output = JSON.stringify(json);
          this.application.notifyObjectsChanged(this.object, this);
        })
      .catch(error => console.error("RestPollController: " + error));
  }
}

Controller.addClass(RestPollController);

export { RestPollController };