/*
 * SmoothEdgesTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Selection } from "../utils/Selection.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { Solid } from "../core/Solid.js";
import { Controls } from "../ui/Controls.js";
import * as THREE from "../lib/three.module.js";

class SmoothEdgesTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "smooth_edges";
    this.label = "tool.smooth_edges.label";
    this.className = "smooth_edges";
    this.setOptions(options);

    this.createPanel();
  }

  createPanel()
  {
    const application = this.application;

    this.panel = application.createPanel(this.label, "left",
      "panel_smooth_edges");
    this.panel.preferredHeight = 100;

    this.smoothAngleElem = Controls.addNumberField(this.panel.bodyElem,
      "smooth_angle", "label.smooth_angle", 20, "row");

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

