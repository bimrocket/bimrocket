/*
 * NewSceneTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { ConfirmDialog } from "../ui/ConfirmDialog.js";


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

    ConfirmDialog.create("tool.new_scene.label", "question.create_new_scene")
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

