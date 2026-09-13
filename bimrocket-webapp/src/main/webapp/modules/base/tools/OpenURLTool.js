/**
 * OpenURLTool
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";

class OpenURLTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "open_url";
    this.label = "bimrocket";
    this.className = "open_url";
    this.iconName = "base|open_url";

    this.url = "http://bimrocket.org";
    this.target = null;

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

  }

  execute()
  {
    window.open(this.url, this.target).focus();
  }
};

export { OpenURLTool };
