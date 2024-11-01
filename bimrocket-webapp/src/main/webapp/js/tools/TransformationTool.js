/*
 * TransformationTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
import { PointSelector } from "../utils/PointSelector.js";
import * as THREE from "three";

class TransformationTool extends Tool
{
  constructor(application, options)
  {
    super(application);

    this.panel = null;
    this.stage = 0;
    this.objectMatrices = new Map();

    this._onPointerUp = this.onPointerUp.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onContextMenu = this.onContextMenu.bind(this);

    this.axisMatrixWorld = new THREE.Matrix4();
    this._matrix1 = new THREE.Matrix4();
    this._matrix2 = new THREE.Matrix4();
    this._matrix3 = new THREE.Matrix4();

    application.addEventListener("scene", event =>
    {
      if (event.type === "structureChanged"
          && event.objects[0] instanceof THREE.Scene)
      {
        this.resetTool();
      }
    });

    application.addEventListener("tool", event =>
    {
      const tool = event.tool;
      const type = event.type;

      if (type === "activated" &&
          tool instanceof TransformationTool && tool !== this)
      {
        this.resetTool();
      }
    });
  }

  createPanel()
  {
    console.warn("abstract method");
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

  setStage(stage)
  {
    console.warn("abstract method");
  }

  onPointerUp(event)
  {
  }

  onPointerMove(event)
  {
  }

  onContextMenu(event)
  {
    const application = this.application;

    if (!application.isCanvasEvent(event)) return;

    event.preventDefault();
  }

  transformObjects(transformMatrixWorld, changedProperties)
  {
    const application = this.application;

    const roots = application.selection.roots;
    const localMoveMatrix = this._matrix2;
    const parentMatrixInverse = this._matrix3;
    for (let object of roots)
    {
      let objectMatrix = this.objectMatrices.get(object);
      if (objectMatrix === undefined)
      {
        objectMatrix = object.matrix.clone();
        this.objectMatrices.set(object, objectMatrix);
      }

      object.parent.updateMatrix();
      object.parent.updateMatrixWorld();

      localMoveMatrix.copy(object.parent.matrixWorld);
      localMoveMatrix.premultiply(transformMatrixWorld);
      parentMatrixInverse.copy(object.parent.matrixWorld).invert();
      localMoveMatrix.premultiply(parentMatrixInverse);
      localMoveMatrix.multiply(objectMatrix);
      localMoveMatrix.decompose(
        object.position, object.quaternion, object.scale);

      object.updateMatrix();
      object.updateMatrixWorld();
    }
    application.notifyObjectsChanged(roots, this, "nodeChanged",
      changedProperties);
  }

  resetTool()
  {
    this.objectMatrices.clear();
    this.stage = 0;
  }
}

export { TransformationTool };