/*
 * MeasureLengthTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
import { Controls } from "../ui/Controls.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import * as THREE from "three";

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

    this.panel.onHide = () => this.application.useTool(null);

    this.helpElem = document.createElement("div");
    this.helpElem.style.padding = "8px";
    this.panel.bodyElem.appendChild(this.helpElem);

    I18N.set(this.helpElem, "textContent", "tool.measure_length.help");

    const resetButton = Controls.addButton(this.panel.bodyElem,
      "clear_linestring", "button.clear", () => this.clearLineString());

    const undoButton = Controls.addButton(this.panel.bodyElem,
      "undo_last", "button.undo", () => this.removeLastPoint());

    this.distElem = document.createElement("div");
    this.distElem.style.padding = "8px";

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
    const application = this.application;

    if (!application.isCanvasEvent(event)) return;

    const pointSelector = application.pointSelector;

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
    const pointSelector = this.application.pointSelector;

    if (this.vertices.length > 0)
    {
      this.vertices.pop();
      this.updateLineString();

      if (this.vertices.length > 0)
      {
        let lastVertex = this.vertices[this.vertices.length - 1];
        pointSelector.auxiliaryLines.pop();
        let axisMatrixWorld = new THREE.Matrix4();
        axisMatrixWorld.setPosition(lastVertex);
        pointSelector.setAxisGuides(axisMatrixWorld, true);
      }
      else
      {
        pointSelector.clearAxisGuides();
      }
    }
  }

  updateLineString()
  {
    const application = this.application;

    if (this.line !== null)
    {
      application.removeObject(this.line);
    }

    if (this.points !== null)
    {
      application.removeObject(this.points);
    }

    const overlayedObjects = application.addOverlay(this.vertices, false,
      this.lineMaterial, this.pointsMaterial);

    this.line = overlayedObjects.line;
    this.points = overlayedObjects.points;

    application.repaint();

    let length = this.getLineStringLength();

    I18N.set(this.distElem, "textContent", "message.measure_length",
      length.toFixed(application.setup.decimals), application.setup.units);
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
