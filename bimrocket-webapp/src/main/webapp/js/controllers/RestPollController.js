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
    this.searchParams = ""; // JSON string
    this.body = ""; // JSON string
    this.output = ""; // JSON string
    this.jsonOutput = {}; // JSON output
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
    this.updateFormulas();

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

  async connect()
  {
    const headers = new Headers();

    const options = {
      method: this.method,
      headers: headers,
      mode: "cors",
      cache: "no-cache"
    };

    let url = this.url;

    if (this.searchParams?.length > 0)
    {
      url += "?" + new URLSearchParams(JSON.parse(this.searchParams));
    }

    if (this.body?.length > 0 && this.method !== "GET")
    {
      headers.set("Content-Type", "application/json;charset=utf-8");
      options.body = this.body;
    }

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

    const request = new Request(url, options);

    let response = await fetch(request);
    this.output = await response.text();
    try
    {
      this.jsonOutput = JSON.parse(this.output);
      console.info("RestPollController", this.jsonOutput);
    }
    catch (ex)
    {
      console.error("Invalid JSON response: " + ex);
    }

    this.application.notifyObjectsChanged(this.object, this);
  }
}

Controller.addClass(RestPollController);

export { RestPollController };