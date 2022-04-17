/*
 * FullscreenTool.js
 *
 * @author realor
 */
import { Tool } from "./Tool.js";

class FullscreenTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "fullscreen";
    this.label = "tool.fullscreen.label";
    this.className = "fullscreen";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    const application = this.application;
    application.fullscreen();
  }
}

export { FullscreenTool };



