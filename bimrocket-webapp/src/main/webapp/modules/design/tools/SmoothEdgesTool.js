/*
 * SmoothEdgesTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { Selection } from "platform/utils/Selection.js";
import { ObjectUtils } from "platform/utils/ObjectUtils.js";
import { Solid } from "platform/core/Solid.js";
import { Controls } from "platform/ui/Controls.js";
import * as THREE from "three";

class SmoothEdgesTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "smooth_edges";
    this.label = "design|tool.smooth_edges.label";
    this.className = "smooth-edges";
    this.iconName = "design|smooth-edges";

    this.setOptions(options);
    application.addTool(this);

    this.createPanel();
  }

  createPanel()
  {
    const application = this.application;

    this.panel = this.application.createToolPanel(this)
      .setDefaultHeight(180)
      .setDefaultMobileHeight(160)
      .setMinimumHeight(100);

    this.panel.onClose = () => this.application.useTool(null);

    this.smoothAngleElem = Controls.addNumberField(this.panel.bodyElem,
      "smooth_angle", "design|label.smooth_angle", 20, "row");

    this.smoothAngleElem.style.width = "50px";
    this.smoothAngleElem.min = 0;
    this.smoothAngleElem.max = 180;

    this.applyButton = Controls.addButton(this.panel.bodyElem,
      "apply_smooth", "button.apply", () => this.applySmooth());
  }

  activate()
  {
    this.panel.visible = true;
  }

  deactivate()
  {
    this.panel.visible = false;
  }

  applySmooth()
  {
    let smoothAngle = parseFloat(this.smoothAngleElem.value);
    if (smoothAngle < 0) smoothAngle = 0;
    else if (smoothAngle > 180) smoothAngle = 180;

    const changed = [];

    let roots = this.application.selection.roots;
    for (let root of roots)
    {
      this.traverse(root, smoothAngle, changed);
    }
    this.application.notifyObjectsChanged(changed, this);
  }

  traverse(object, smoothAngle, changed)
  {
    if (object instanceof Solid)
    {
      let objectChanged = false;

      if (object.geometry.smoothAngle !== smoothAngle)
      {
        object.geometry.smoothAngle = smoothAngle;
        object.geometry.updateBuffers();
        objectChanged = true;
      }

      if (object.builder && object.builder.smoothAngle !== undefined)
      {
        if (object.builder.smoothAngle !== smoothAngle)
        {
          object.builder.smoothAngle = smoothAngle;
          objectChanged = true;
        }
      }
      if (objectChanged) changed.push(object);
    }
    else
    {
      let children = object.children;
      for (let child of children)
      {
        this.traverse(child, smoothAngle, changed);
      }
    }
  }
}

export { SmoothEdgesTool };

