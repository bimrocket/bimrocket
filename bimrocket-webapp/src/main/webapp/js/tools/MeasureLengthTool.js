/*
 * MeasureLengthTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
import { Controls } from "../ui/Controls.js";
import * as THREE from "../lib/three.module.js";

class MeasureLengthTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "measure_length";
    this.label = "tool.measure_length.label";
    this.help = "tool.measure_length.help";
    this.className = "measure_length";
    this.setOptions(options);

    this.points = [];
    this.lineString = null;
    this.material = new THREE.LineBasicMaterial(
      { linewidth:2, color: new THREE.Color(0x0000ff), opacity: 1,
      depthTest: false});
    this._onMouseUp = this.onMouseUp.bind(this);

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 120;

    const helpElem = document.createElement("div");
    this.panel.bodyElem.appendChild(helpElem);

    const resetButton = Controls.addButton(this.panel.bodyElem,
      "reset_linestring", "button.reset", () => this.resetLineString());

    const undoButton = Controls.addButton(this.panel.bodyElem,
      "undo_last", "button.undo", () => this.removeLastPoint());

    this.distElem = document.createElement("div");
    this.distElem.style.textAlign = "left";
    this.distElem.style.padding = "10px";

    this.panel.bodyElem.appendChild(this.distElem);
  }

  activate()
  {
    this.panel.visible = true;
    var container = this.application.container;
    container.addEventListener('mouseup', this._onMouseUp, false);
  }

  deactivate()
  {
    this.panel.visible = false;
    var container = this.application.container;
    container.removeEventListener('mouseup', this._onMouseUp, false);
  }

  onMouseUp(event)
  {
    if (!this.isCanvasEvent(event)) return;

    const scene = this.application.scene;
    let mousePosition = this.getMousePosition(event);
    let intersect = this.intersect(mousePosition, scene, true);
    if (intersect)
    {
      let point = intersect.point;
      this.points.push(point);
      this.updateLineString();
    }
  }

  resetLineString()
  {
    this.points = [];
    this.updateLineString();
  }

  removeLastPoint()
  {
    this.points.pop();
    this.updateLineString();
  }

  updateLineString()
  {
    const application = this.application;
    const overlays = application.overlays;

    if (this.lineString !== null)
    {
      overlays.remove(this.lineString);
    }
    let vertices = [];
    for (let point of this.points)
    {
      vertices.push(point);
    }
    let geometry = new THREE.BufferGeometry();
    geometry.setFromPoints(vertices);

    this.lineString = new THREE.Line(geometry, this.material, THREE.LineStrip);
    this.lineString.raycast = function(){};
    overlays.add(this.lineString);
    application.repaint();

    let length = (this.getLineStringLength()).toFixed(application.decimals);

    I18N.set(this.distElem, "innerHTML", "message.measure_length",
      length, application.units);
    application.i18n.update(this.distElem);
  }

  getLineStringLength()
  {
    let length = 0;
    const v = new THREE.Vector3();
    for (let i = 0; i < this.points.length - 1; i++)
    {
      let p1 = this.points[i];
      let p2 = this.points[i + 1];
      v.set(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
      length += v.length();
    }
    return length;
  }
}

export { MeasureLengthTool };
