/*
 * NewSceneTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";

class NewSceneTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "new_scene";
    this.label = "tool.new_scene.label";
    this.help = "tool.new_scene.help";
    this.className = "new_scene";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    const application = this.application;

    application.initScene();
    application.useTool(null);
  }
}

export { NewSceneTool };

