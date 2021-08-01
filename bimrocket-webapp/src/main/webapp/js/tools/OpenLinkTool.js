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
    this.immediate = true;
    this.setOptions(options);

    this.url = options.url;
    this.target = options.target || null;
  }

  execute()
  {
    window.open(this.url, this.target).focus();
  }
};

export { OpenLinkTool };
