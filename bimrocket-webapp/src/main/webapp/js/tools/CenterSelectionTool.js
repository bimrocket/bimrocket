/*
 * CenterTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { I18N } from "../i18n/I18N.js";

class CenterSelectionTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "center_selection";
    this.label = "tool.center_selection.label";
    this.help = "tool.center_selection.help";
    this.className = "center_selection";
    this.focusOnSelection = false;
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    const application = this.application;
    let objects = application.selection.roots;
    if (objects.length > 0)
    {
      if (this.focusOnSelection)
      {
        application.updateVisibility(application.baseObject, false);
        application.updateVisibility(objects, true);
      }
      const container = application.container;
      const aspect = container.clientWidth / container.clientHeight;
      const camera = application.camera;

      application.scene.updateMatrixWorld(true);
      ObjectUtils.zoomAll(camera, objects, aspect, true);

      application.notifyObjectsChanged(camera, this);
    }
  }
}

export { CenterSelectionTool };