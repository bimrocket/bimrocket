/**
 * OpenLinkTool
 *
 * @author realor
 */

import { Tool } from "../tools/Tool.js";

class OpenLinkTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "open_link";
    this.label = "tool.open_link.label";
    this.className = "open_link";

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

export { OpenLinkTool };
