/*
 * MoveTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Controls } from "../ui/Controls.js";
import { I18N } from "../i18n/I18N.js";
import { PointSelector } from "../utils/PointSelector.js";
import * as THREE from "../lib/three.module.js";

class MoveTool extends Tool
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
    this.stage = 0;
    this.anchorPointWorld = new THREE.Vector3();
    this.targetPointWorld = new THREE.Vector3();
    this.offset = 0;
    this.objectPositions = new Map();

    this.moveVectorWorld = new THREE.Vector3();
    this.moveVector = new THREE.Vector3();
    this.matrixPosition = new THREE.Vector3();
    this.matrix = new THREE.Matrix4();

    this._onPointerUp = this.onPointerUp.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onContextMenu = this.onContextMenu.bind(this);

    application.addEventListener("scene", event =>
    {
      if (event.type === "structureChanged"
          && event.objects[0] instanceof THREE.Scene)
      {
        this.setStage(0);
      }
    });

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

  activate()
  {
    this.panel.visible = true;
    const container = this.application.container;
    container.addEventListener('contextmenu', this._onContextMenu, false);
    container.addEventListener('pointerup', this._onPointerUp, false);
    container.addEventListener('pointermove', this._onPointerMove, false);
    this.setStage(this.stage);
  }

  deactivate()
  {
    this.panel.visible = false;
    const container = this.application.container;
    container.removeEventListener('contextmenu', this._onContextMenu, false);
    container.removeEventListener('pointerup', this._onPointerUp, false);
    container.removeEventListener('pointermove', this._onPointerMove, false);
    this.application.pointSelector.deactivate();
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
      if (this.stage === 0 || this.stage === 2)
      {
        this.objectPositions.clear();
        this.anchorPointWorld.copy(snap.positionWorld);

        if (snap.object)
        {
          let axisMatrixWorld = this.matrix;
          if (snap.object)
          {
            axisMatrixWorld.copy(snap.object.matrixWorld);
          }
          else
          {
            axisMatrixWorld.identity();
          }
          axisMatrixWorld.setPosition(this.anchorPointWorld);
          pointSelector.setAxisGuides(axisMatrixWorld, true);
        }
        this.setStage(1);
      }
      else if (this.stage === 1)
      {
        this.setStage(2);
      }
    }
    else
    {
      this.setStage(0);
    }
  }

  onContextMenu(event)
  {
    const pointSelector = this.application.pointSelector;
    if (!pointSelector.isPointSelectionEvent(event)) return;

    event.preventDefault();
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
        application.pointSelector.excludeSelection = false;
        application.pointSelector.activate();
        this.offsetInputElem.parentElement.style.display = "none";
        this.buttonsPanel.style.display = "none";
        I18N.set(this.helpElem, "innerHTML", "tool.move.select_anchor_point");
        application.i18n.update(this.helpElem);
        break;

      case 1: // set destination point
        application.pointSelector.activate();
        application.pointSelector.excludeSelection = true;
        this.offsetInputElem.parentElement.style.display = "";
        this.offsetInputElem.disabled = true;
        this.buttonsPanel.style.display = "none";
        I18N.set(this.helpElem, "innerHTML", "tool.move.select_destination_point");
        application.i18n.update(this.helpElem);
        break;

      case 2: // set distance
        application.pointSelector.activate();
        application.pointSelector.excludeSelection = false;
        this.offsetInputElem.parentElement.style.display = "";
        this.offsetInputElem.disabled = false;
        this.buttonsPanel.style.display = "";
        I18N.set(this.helpElem, "innerHTML", "tool.move.edit_offset");
        application.i18n.update(this.helpElem);
        break;
    }
  }

  moveObjects()
  {
    const application = this.application;
    const moveVectorWorld = this.moveVectorWorld;
    const moveVector = this.moveVector;
    const matrixPosition = this.matrixPosition;

    moveVectorWorld.subVectors(this.targetPointWorld, this.anchorPointWorld);
    moveVectorWorld.normalize();
    moveVectorWorld.multiplyScalar(this.offset);

    const roots = application.selection.roots;
    const inverseMatrixWorld = this.matrix;
    for (let object of roots)
    {
      object.parent.updateMatrix();
      object.parent.updateMatrixWorld();

      inverseMatrixWorld.copy(object.parent.matrixWorld).invert();

      moveVector.copy(moveVectorWorld);
      moveVector.applyMatrix4(inverseMatrixWorld);

      matrixPosition.setFromMatrixPosition(inverseMatrixWorld);
      moveVector.sub(matrixPosition);

      let position = this.objectPositions.get(object);
      if (position === undefined)
      {
        position = object.position.clone();
        this.objectPositions.set(object, position);
      }

      object.position.copy(position).add(moveVector);
      object.updateMatrix();
    }
    application.notifyObjectsChanged(roots, this, "nodeChanged",
      MoveTool.CHANGED_PROPERTIES);
  }
}

export { MoveTool };

