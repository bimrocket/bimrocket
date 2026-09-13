/*
 * NewSceneTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { ConfirmDialog } from "platform/ui/dialog/ConfirmDialog.js";


class NewSceneTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "new_scene";
    this.label = "base|tool.new_scene.label";
    this.help = "base|tool.new_scene.help";
    this.className = "new-scene";
    this.iconName = "base|new-scene";

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    const application = this.application;

    ConfirmDialog.create("base|tool.new_scene.label",
      "base|question.create_new_scene")
      .setI18N(application.i18n)
      .setAcceptLabel("button.yes")
      .setCancelLabel("button.no")
      .setAction(() =>
    {
      application.initScene();
      application.useTool(null);
    }).show();
  }
}

export { NewSceneTool };

