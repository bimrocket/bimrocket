/*
 * MeasureLengthTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
import { Controls } from "../ui/Controls.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
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

    this.vertices = []; // Vector3[]
    this.line = null; // THREE.Line
    this.points = null; // THREE.Points

    this.lineMaterial = new THREE.LineBasicMaterial(
      { linewidth : 2, color : new THREE.Color(0x0000ff), opacity : 1,
        depthTest : false, transparent : true });

    this.pointsMaterial = new THREE.PointsMaterial(
      { color : 0, size : 4, sizeAttenuation : false,
        depthTest : false, transparent : true });

    this._onPointerUp = this.onPointerUp.bind(this);

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 120;

    const helpElem = document.createElement("div");
    this.panel.bodyElem.appendChild(helpElem);

    const resetButton = Controls.addButton(this.panel.bodyElem,
      "clear_linestring", "button.clear", () => this.clearLineString());

    const undoButton = Controls.addButton(this.panel.bodyElem,
      "undo_last", "button.undo", () => this.removeLastPoint());

    this.distElem = document.createElement("div");
    this.distElem.style.textAlign = "left";
    this.distElem.style.padding = "10px";

    this.panel.bodyElem.appendChild(this.distElem);
  }

  activate()
  {
    const application = this.application;
    const container = application.container;
    this.panel.visible = true;
    container.addEventListener('pointerup', this._onPointerUp, false);
    application.pointSelector.activate();
    if (this.line
        && !ObjectUtils.isObjectDescendantOf(this.line, application.scene))
    {
      this.vertices = [];
      this.updateLineString();
    }
  }

  deactivate()
  {
    const application = this.application;
    const container = application.container;
    this.panel.visible = false;
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

      let vertex = snap.positionWorld;
      this.vertices.push(vertex);
      this.updateLineString();

      pointSelector.auxiliaryPoints = this.vertices;
      let count = this.vertices.length;
      if (count > 1)
      {
        pointSelector.auxiliaryLines.push(
          new THREE.Line3(this.vertices[count - 2], this.vertices[count - 1]));
      }
      pointSelector.setAxisGuides(axisMatrixWorld, true);
    }
    else
    {
      pointSelector.clearAxisGuides();
    }
  }

  clearLineString()
  {
    const pointSelector = this.application.pointSelector;
    pointSelector.auxiliaryPoints = [];
    pointSelector.auxiliaryLines = [];
    pointSelector.clearAxisGuides();
    this.vertices = [];
    this.updateLineString();
  }

  removeLastPoint()
  {
    this.vertices.pop();
    this.updateLineString();
    const pointSelector = this.application.pointSelector;
    pointSelector.auxiliaryLines.pop();
    pointSelector.clearAxisGuides();
  }

  updateLineString()
  {
    const application = this.application;
    const overlays = application.overlays;

    if (this.line !== null)
    {
      application.removeObject(this.line);
      this.line = null;
    }

    if (this.points !== null)
    {
      application.removeObject(this.points);
      this.points = null;
    }

    if (this.vertices.length > 0)
    {
      let geometry = new THREE.BufferGeometry();
      geometry.setFromPoints(this.vertices);

      this.line = new THREE.Line(geometry, this.lineMaterial,
        THREE.LineStrip);
      this.line.raycast = function(){};
      overlays.add(this.line);

      this.points = new THREE.Points(geometry, this.pointsMaterial);
      this.points.raycast = function(){};
      overlays.add(this.points);
    }

    application.repaint();

    let length = this.getLineStringLength();

    I18N.set(this.distElem, "innerHTML", "message.measure_length",
      length.toFixed(application.decimals), application.units);
    application.i18n.update(this.distElem);
  }

  getLineStringLength()
  {
    let length = 0;
    const v = new THREE.Vector3();
    for (let i = 0; i < this.vertices.length - 1; i++)
    {
      let p1 = this.vertices[i];
      let p2 = this.vertices[i + 1];
      v.set(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
      length += v.length();
    }
    return length;
  }
}

export { MeasureLengthTool };
