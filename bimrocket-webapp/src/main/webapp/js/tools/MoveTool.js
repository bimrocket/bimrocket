/*
 * MoveTool.js
 *
 * @author realor
 */

import { TransformationTool } from "./TransformationTool.js";
import { Controls } from "../ui/Controls.js";
import { I18N } from "../i18n/I18N.js";
import { PointSelector } from "../utils/PointSelector.js";
import * as THREE from "../lib/three.module.js";

class MoveTool extends TransformationTool
{
  static CHANGED_PROPERTIES = ["position"];

  constructor(application, options)
  {
    super(application);
    this.name = "move";
    this.label = "tool.move.label";
    this.className = "move";
    this.snapDistance = 0.1;
    this.snapPercent = 0.3;
    this.setOptions(options);

    // internals
    this.anchorPointWorld = new THREE.Vector3();
    this.targetPointWorld = new THREE.Vector3();
    this.offset = 0;
    this.moveVectorWorld = new THREE.Vector3();

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left", "panel_move");
    this.panel.preferredHeight = 140;

    this.helpElem = document.createElement("div");
    this.panel.bodyElem.appendChild(this.helpElem);

    this.offsetInputElem = Controls.addNumberField(this.panel.bodyElem,
      "move_offset", "label.offset", 0);
    this.offsetInputElem.step = this.snapDistance;
    this.offsetInputElem.addEventListener("change", event =>
    {
      this.offset = this.offsetInputElem.value;
      this.moveObjects();
    }, false);

    this.buttonsPanel = document.createElement("div");
    this.panel.bodyElem.appendChild(this.buttonsPanel);

    this.acceptButton = Controls.addButton(this.buttonsPanel,
      "cancel_section", "button.accept", event =>
    {
      this.offset = this.offsetInputElem.value;
      this.moveObjects();
      this.setStage(0);
    });

    this.cancelButton = Controls.addButton(this.buttonsPanel,
      "cancel_section", "button.cancel", event =>
    {
      this.offset = 0;
      this.moveObjects();
      this.setStage(0);
    });
  }

  onPointerMove(event)
  {
    if (this.stage === 1)
    {
      const application = this.application;
      const pointSelector = application.pointSelector;
      if (!pointSelector.isPointSelectionEvent(event)) return;

      event.preventDefault();

      const snap = pointSelector.snap;
      if (snap)
      {
        this.targetPointWorld.copy(snap.positionWorld);
        const moveVectorWorld = this.moveVectorWorld;
        moveVectorWorld.subVectors(this.targetPointWorld, this.anchorPointWorld);

        this.offset = moveVectorWorld.length();
        if (snap.type === PointSelector.GUIDE_SNAP)
        {
          let divisions = this.offset / this.snapDistance;
          let intDivisions = Math.round(divisions);
          let decimals = divisions - intDivisions;
          if (decimals >= -this.snapPercent && decimals <= this.snapPercent)
          {
            const k = 1000000;
            this.offset = Math.round(k * intDivisions * this.snapDistance) / k;
          }
        }
        this.moveObjects();
        this.offsetInputElem.value = this.offset;
      }
      else
      {
        this.offsetInputElem.value = null;
      }
    }
  }

  onPointerUp(event)
  {
    const application = this.application;
    const pointSelector = application.pointSelector;
    if (!pointSelector.isPointSelectionEvent(event)) return;

    const snap = pointSelector.snap;
    if (snap)
    {
      if (this.stage === 0 || this.stage === 2) // anchor point
      {
        this.objectMatrices.clear();
        this.anchorPointWorld.copy(snap.positionWorld);

        if (snap.object)
        {
          let axisMatrixWorld = this.axisMatrixWorld;
          if (snap.object)
          {
            axisMatrixWorld.copy(snap.object.matrixWorld);
          }
          else
          {
            axisMatrixWorld.identity();
          }
          axisMatrixWorld.setPosition(this.anchorPointWorld);
          if (application.selection.isEmpty())
          {
            application.selection.set(snap.object);
          }
        }
        this.setStage(1);
      }
      else if (this.stage === 1) // destination point
      {
        this.setStage(2);
      }
    }
    else
    {
      this.setStage(0);
    }
  }

  setStage(stage)
  {
    this.stage = stage;

    const application = this.application;

    switch (stage)
    {
      case 0: // set anchor point
        this.offset = 0;
        application.pointSelector.clearAxisGuides();
        application.pointSelector.filter = PointSelector.VISIBLE_FILTER;
        application.pointSelector.auxiliaryPoints = [];
        application.pointSelector.activate();
        this.offsetInputElem.parentElement.style.display = "none";
        this.buttonsPanel.style.display = "none";
        I18N.set(this.helpElem, "textContent", "tool.move.select_anchor_point");
        application.i18n.update(this.helpElem);
        break;

      case 1: // set destination point
        application.pointSelector.setAxisGuides(this.axisMatrixWorld, true);
        application.pointSelector.filter = PointSelector.VISIBLE_UNSELECTED_FILTER;
        application.pointSelector.auxiliaryPoints = [];
        application.pointSelector.activate();
        this.offsetInputElem.parentElement.style.display = "";
        this.offsetInputElem.disabled = true;
        this.buttonsPanel.style.display = "none";
        I18N.set(this.helpElem, "textContent", "tool.move.select_destination_point");
        application.i18n.update(this.helpElem);
        break;

      case 2: // set distance
        application.pointSelector.clearAxisGuides();
        application.pointSelector.filter = PointSelector.VISIBLE_FILTER;
        application.pointSelector.auxiliaryPoints = [];
        application.pointSelector.activate();
        this.offsetInputElem.parentElement.style.display = "";
        this.offsetInputElem.disabled = false;
        this.buttonsPanel.style.display = "";
        I18N.set(this.helpElem, "textContent", "tool.move.edit_offset");
        application.i18n.update(this.helpElem);
        break;
    }
  }

  moveObjects()
  {
    const application = this.application;
    const moveVectorWorld = this.moveVectorWorld;
    moveVectorWorld.subVectors(this.targetPointWorld, this.anchorPointWorld);
    moveVectorWorld.normalize();
    moveVectorWorld.multiplyScalar(this.offset);

    const moveMatrixWorld = this._matrix1;
    moveMatrixWorld.identity().setPosition(moveVectorWorld);

    this.transformObjects(moveMatrixWorld, MoveTool.CHANGED_PROPERTIES);
  }

  resetTool()
  {
    super.resetTool();
    this.offset = 0;
  }
}

export { MoveTool };

