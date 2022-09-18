/*
 * PlaceTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Controls } from "../ui/Controls.js";
import { I18N } from "../i18n/I18N.js";
import { PointSelector } from "../utils/PointSelector.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import * as THREE from "../lib/three.module.js";

class PlaceTool extends Tool
{
  static CHANGED_PROPERTIES = ["position", "rotation"];
  static GLOBAL_MODE = 0;
  static LOCAL_MODE = 1;
  static PERPENDICULAR_MODE = 2;

  constructor(application, options)
  {
    super(application);
    this.name = "place";
    this.label = "tool.place.label";
    this.help = "tool.place.help";
    this.className = "place";
    this.setOptions(options);

    this.stage = 0;
    this.snap = null;
    this.mode = 0;
    this.localMatrix = new THREE.Matrix4();
    this.axisMatrixWorld = new THREE.Matrix4();

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onContextMenu = this.onContextMenu.bind(this);

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left", "panel_place");
    this.panel.preferredHeight = 140;

    this.helpElem = document.createElement("div");
    this.panel.bodyElem.appendChild(this.helpElem);
    I18N.set(this.helpElem, "innerHTML", "tool.place.help");

    this.modeElem = Controls.addSelectField(this.panel.bodyElem,
      "place_mode", "label.place_mode",
      [[PlaceTool.GLOBAL_MODE, "Global"],
       [PlaceTool.LOCAL_MODE, "Local"],
       [PlaceTool.PERPENDICULAR_MODE, "Perpendicular"]]);
    this.modeElem.addEventListener("change",
      event => {
        this.mode = parseInt(this.modeElem.value);
        this.placeObject();
      });
  }

  activate()
  {
    this.panel.visible = true;
    const application = this.application;
    const container = application.container;
    container.addEventListener('contextmenu', this._onContextMenu, false);
    container.addEventListener('pointerdown', this._onPointerDown, false);
    container.addEventListener('pointerup', this._onPointerUp, false);
    container.addEventListener('pointermove', this._onPointerMove, false);
    this.setStage(this.stage);

    application.pointSelector.auxiliaryLines = [];
    application.pointSelector.activate();
    application.pointSelector.filter = PointSelector.VISIBLE_UNSELECTED_FILTER;
    application.pointSelector.clearAxisGuides();

    this.preparePlacement();
  }

  deactivate()
  {
    this.panel.visible = false;
    const application = this.application;
    const container = application.container;
    container.removeEventListener('contextmenu', this._onContextMenu, false);
    container.removeEventListener('pointerdown', this._onPointerDown, false);
    container.removeEventListener('pointerup', this._onPointerUp, false);
    container.removeEventListener('pointermove', this._onPointerMove, false);

    application.pointSelector.deactivate();
  }

  onPointerDown(event)
  {
    const pointSelector = this.application.pointSelector;
    if (!pointSelector.isPointSelectionEvent(event)) return;

    event.preventDefault();

    this.preparePlacement();

    this.snap = pointSelector.snap;
    this.placeObject();
    this.setStage(1);
  }

  onPointerMove(event)
  {
    if (this.stage === 0) return;

    const pointSelector = this.application.pointSelector;
    if (!pointSelector.isPointSelectionEvent(event)) return;

    event.preventDefault();

    this.snap = pointSelector.snap;
    this.placeObject();
  }

  onPointerUp(event)
  {
    if (this.stage === 1)
    {
      event.preventDefault();

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
  }

  preparePlacement()
  {
    const application = this.application;
    const object = application.selection.object;
    if (application.selection.size > 1)
    {
      application.selection.set(object);
    }
  }

  placeObject()
  {
    const application = this.application;
    const object = application.selection.object;
    const snap = this.snap;

    if (object === null || object.parent === null || snap === null) return;

    const axisMatrixWorld = this.axisMatrixWorld;

    switch (this.mode)
    {
      case PlaceTool.GLOBAL_MODE:
        axisMatrixWorld.identity();
        break;

      case PlaceTool.LOCAL_MODE:
        axisMatrixWorld.copy(snap.object.matrixWorld);
        break;

      case PlaceTool.PERPENDICULAR_MODE:
        if (snap.normalWorld)
        {
          this.setPerpendicularMatrix(snap, axisMatrixWorld);
        }
        else
        {
          axisMatrixWorld.identity();
        }
        break;
    }
    axisMatrixWorld.setPosition(snap.positionWorld);

    const matrix = this.localMatrix;
    matrix.copy(object.parent.matrixWorld).invert();
    matrix.multiply(axisMatrixWorld);

    matrix.decompose(object.position, object.rotation, new THREE.Vector3());
    object.updateMatrix();

    application.notifyObjectsChanged(object, this, "nodeChanged",
      PlaceTool.CHANGED_PROPERTIES);
  }

  setPerpendicularMatrix(snap, axisMatrixWorld)
  {
    const objectMatrixWorld = snap.object.matrixWorld;

    const xAxis = new THREE.Vector3();
    const yAxis = new THREE.Vector3();
    const zAxis = new THREE.Vector3();
    const upVector = new THREE.Vector3(0, 0, 1);

    zAxis.copy(snap.normalWorld);

    if (Math.abs(upVector.dot(zAxis)) < 0.999)
    {
      xAxis.crossVectors(upVector, zAxis);
      yAxis.crossVectors(zAxis, xAxis);
    }
    else
    {
      GeometryUtils.orthogonalVector(zAxis, yAxis);
      xAxis.crossVectors(yAxis, zAxis).normalize();
    }
    xAxis.normalize();
    yAxis.normalize();
    zAxis.normalize();

    axisMatrixWorld.makeBasis(xAxis, yAxis, zAxis);
  }

  vectorToGlobal(vector, matrixWorld)
  {
    vector.applyMatrix4(matrixWorld);

    let origin = new THREE.Vector3();
    origin.setFromMatrixPosition(matrixWorld);
    vector.sub(origin);
  }
}

export { PlaceTool };
