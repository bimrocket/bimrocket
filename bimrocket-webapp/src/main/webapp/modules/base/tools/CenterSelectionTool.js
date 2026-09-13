/*
 * CenterTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { ObjectUtils } from "platform/utils/ObjectUtils.js";
import { I18N } from "platform/i18n/I18N.js";

class CenterSelectionTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "center_selection";
    this.label = "base|tool.center_selection.label";
    this.help = "base|tool.center_selection.help";
    this.iconName = "base|center-selection";
    this.focusOnSelection = false;
    this.includeInvisible = true;

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

      application.baseObject.updateMatrixWorld(true);
      ObjectUtils.zoomAll(camera, objects, aspect, this.includeInvisible);

      application.notifyObjectsChanged(camera, this);
    }
  }
}

export { CenterSelectionTool };