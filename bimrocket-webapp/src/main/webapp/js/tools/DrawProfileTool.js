/*
 * DrawProfileTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import * as THREE from "../lib/three.module.js";

class DrawProfileTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "fly";
    this.label = "tool.draw_profile.label";
    this.help = "tool.draw_profile.help";
    this.className = "draw_profile";
    this.setOptions(options);

    this._onPointerUp = this.onPointerUp.bind(this);
  }

  activate()
  {
    const application = this.application;
    const container = application.container;
    container.addEventListener('pointerup', this._onPointerUp, false);
    application.pointSelector.activate();
  }

  deactivate()
  {
    const application = this.application;
    const container = application.container;
    container.removeEventListener('pointerup', this._onPointerUp, false);
    application.pointSelector.deactivate();
  }

  onPointerUp(event)
  {
    const pointSelector = this.application.pointSelector;
    if (!pointSelector.isPointSelectionEvent(event)) return;

    let snap = pointSelector.snap;
    if (snap)
    {
      let axisMatrixWorld = snap.object ?
        snap.object.matrixWorld.clone() : new THREE.Matrix4();

      axisMatrixWorld.setPosition(snap.positionWorld);

      pointSelector.setAxisGuides(axisMatrixWorld, true);
    }
    else
    {
      pointSelector.clearAxisGuides();
    }
  }
}

export { DrawProfileTool };