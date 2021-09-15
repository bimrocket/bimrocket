/*
 * MoveTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class MoveTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "move";
    this.label = "tool.move.label";
    this.help = "tool.move.help";
    this.className = "move";
    this.setOptions(options);

    // internals
    this.objects = [];
    this.initialPoint = new THREE.Vector3();
    this.initialPosition = new THREE.Vector3();
    this.vector = new THREE.Vector3();
    this.inverseMatrixWorld = new THREE.Matrix4();

    this._onMouseUp = this.onMouseUp.bind(this);
    this._onMouseDown = this.onMouseDown.bind(this);
    this._onMouseMove = this.onMouseMove.bind(this);
    this._onContextMenu = this.onContextMenu.bind(this);

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 120;

    I18N.set(this.panel.bodyElem, "innerHTML", this.help);
  }

  activate()
  {
    this.panel.visible = true;
    const container = this.application.container;
    container.addEventListener('contextmenu', this._onContextMenu, false);
    container.addEventListener('mousedown', this._onMouseDown, false);
  }

  deactivate()
  {
    this.panel.visible = false;
    const container = this.application.container;
    container.removeEventListener('contextmenu', this._onContextMenu, false);
    container.removeEventListener('mousedown', this._onMouseDown, false);
  }

  onMouseDown(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();

    const application = this.application;

    this.objects = application.selection.roots;
    if (this.objects.length > 0)
    {
      let mousePosition = this.getMousePosition(event);
      const scene = application.scene;
      let intersect = this.intersect(mousePosition, scene, true);
      if (intersect !== null)
      {
        this.initialPoint.copy(intersect.point);
        let object = this.objects[0];

        this.initialPosition.copy(object.position);
        const container = this.application.container;
        container.addEventListener('mousemove', this._onMouseMove, false);
        container.addEventListener('mouseup', this._onMouseUp, false);

        object.parent.updateMatrix();
        object.parent.updateMatrixWorld(true);
        this.inverseMatrixWorld.copy(object.parent.matrixWorld).invert();
      }
    }
  }

  onMouseMove(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();

    const application = this.application;

    const mousePosition = this.getMousePosition(event);
    const scene = application.scene;
    let intersect = this.intersect(mousePosition, scene, true);
    if (intersect !== null)
    {
      let v0 = new THREE.Vector3();
      v0.copy(this.initialPoint);
      v0.applyMatrix4(this.inverseMatrixWorld);

      let v1 = new THREE.Vector3();
      v1.copy(intersect.point);
      v1.applyMatrix4(this.inverseMatrixWorld);

      this.vector.subVectors(v1, v0);
      for (let i = 0; i < this.objects.length; i++)
      {
        let object = this.objects[i];
        object.position.copy(this.initialPosition);
        object.position.add(this.vector);
        object.updateMatrix();
      }
      const changeEvent = {type: "nodeChanged",
        objects: this.objects, source : this};
      application.notifyEventListeners("scene", changeEvent);
    }
  }

  onMouseUp(event)
  {
    if (!this.isCanvasEvent(event)) return;

    this.object = null;

    var container = this.application.container;
      container.removeEventListener('mousemove', this._onMouseMove, false);
      container.removeEventListener('mouseup', this._onMouseUp, false);
  }

  onContextMenu(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();
  }
}

export { MoveTool };

