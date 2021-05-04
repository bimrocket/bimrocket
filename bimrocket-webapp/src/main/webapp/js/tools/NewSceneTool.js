/*
 * NewSceneTool.js
 *
 * @autor: realor
 */

BIMROCKET.NewSceneTool = class extends BIMROCKET.Tool
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
    var application = this.application;

    application.initScene();
    application.useTool("opencloud");
  }
};
