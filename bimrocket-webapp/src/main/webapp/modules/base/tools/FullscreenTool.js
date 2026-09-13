/*
 * FullscreenTool.js
 *
 * @author realor
 */
import { Tool } from "platform/ui/Tool.js";

class FullscreenTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "fullscreen";
    this.label = "base|tool.fullscreen.label";
    this.className = "fullscreen";
    this.iconName = "base|fullscreen";
    
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    const application = this.application;
    application.fullscreen();
  }
}

export { FullscreenTool };



