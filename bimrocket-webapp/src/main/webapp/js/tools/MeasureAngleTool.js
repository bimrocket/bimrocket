/*
 * MeasureAngleTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
import { Controls } from "../ui/Controls.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import * as THREE from "../lib/three.module.js";

class MeasureAngleTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "measure_angle";
    this.label = "tool.measure_angle.label";
    this.className = "measure_angle";
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

    this.helpElem = document.createElement("div");
    this.helpElem.style.padding = "8px";
    this.panel.bodyElem.appendChild(this.helpElem);

    const resetButton = Controls.addButton(this.panel.bodyElem,
      "clear_measure_angle", "button.clear", () => this.clearMeasureAngle());

    this.angleElem = document.createElement("div");
    this.angleElem.style.padding = "8px";

    this.panel.bodyElem.appendChild(this.angleElem);
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
    }
    this.updateAngle();
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

      if (this.vertices.length === 3)
      {
        this.vertices = [];
      }

      let vertex = snap.positionWorld;
      this.vertices.push(vertex);
      this.updateAngle();

      const count = this.vertices.length;
      if (count === 0 || count === 3)
      {
        pointSelector.clearAxisGuides();
      }
      else
      {
        pointSelector.setAxisGuides(axisMatrixWorld, true);
      }
    }
    else
    {
      pointSelector.clearAxisGuides();
    }
  }

  updateAngle()
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

    if (this.vertices.length === 3)
    {
      let segments = [];
      segments.push(this.vertices[0], this.vertices[1]);
      segments.push(this.vertices[0], this.vertices[2]);
      this.addCurveSegments(segments);
      this.line = application.addOverlay(segments, true, this.lineMaterial).line;
      this.points = application.addOverlay(this.vertices, false, null,
        this.pointsMaterial).points;
    }
    else
    {
      const overlayedObjects = application.addOverlay(this.vertices,
        false, this.lineMaterial, this.pointsMaterial);
      this.line = overlayedObjects.line;
      this.points = overlayedObjects.points;
    }

    application.repaint();

    if (this.vertices.length === 0)
    {
      I18N.set(this.helpElem, "textContent",
        "tool.measure_angle.select_first_point");
      I18N.set(this.angleElem, "textContent", "");
    }
    else if (this.vertices.length === 1)
    {
      I18N.set(this.helpElem, "textContent",
        "tool.measure_angle.select_second_point");
      I18N.set(this.angleElem, "textContent", "");
    }
    else if (this.vertices.length === 2)
    {
      I18N.set(this.helpElem, "textContent",
        "tool.measure_angle.select_third_point");
      I18N.set(this.angleElem, "textContent", "");
    }
    else if (this.vertices.length === 3)
    {
      let deg = this.getAngle();
      deg = Math.round(deg * 1000) / 1000;

      I18N.set(this.helpElem, "textContent",
        "tool.measure_angle.select_first_point");

      I18N.set(this.angleElem, "textContent", "message.measure_angle", deg);
    }
    application.i18n.update(this.helpElem);
    application.i18n.update(this.angleElem);
  }

  clearMeasureAngle()
  {
    this.vertices = [];
    this.updateAngle();
    this.application.pointSelector.clearAxisGuides();
  }

  getAngle()
  {
    const v0 = this.vertices[0];
    const v1 = this.vertices[1];
    const v2 = this.vertices[2];

    let v01 = new THREE.Vector3();
    v01.subVectors(v1, v0).normalize();

    let v02 = new THREE.Vector3();
    v02.subVectors(v2, v0).normalize();

    let rad = Math.acos(v01.dot(v02));
    let deg = THREE.MathUtils.radToDeg(rad);

    return deg;
  }

  addCurveSegments(segments)
  {
    const v0 = this.vertices[0];
    const v1 = this.vertices[1];
    const v2 = this.vertices[2];

    let v01 = new THREE.Vector3();
    v01.subVectors(v1, v0);
    let len01 = v01.length();
    v01.normalize();

    let v02 = new THREE.Vector3();
    v02.subVectors(v2, v0);
    let len02 = v02.length();
    v02.normalize();

    let vz = new THREE.Vector3();
    vz.crossVectors(v01, v02).normalize();
    let vx = v01;
    let vy = new THREE.Vector3();
    vy.crossVectors(vz, vx);

    const matrix = new THREE.Matrix4();
    matrix.makeBasis(vx, vy, vz);
    matrix.setPosition(v0);

    const angleRad = Math.acos(v01.dot(v02));

    const radius = 0.5 * Math.min(len01, len02);
    const divisions = Math.max(32, Math.round(256 * radius));
    const delta = 2 * Math.PI / divisions;

    for (let rad = 0; rad < angleRad; rad += delta)
    {
      let point1 = new THREE.Vector3();
      point1.x = radius * Math.cos(rad);
      point1.y = radius * Math.sin(rad);
      point1.applyMatrix4(matrix);

      let point2 = new THREE.Vector3();
      let rad2 = rad + delta;
      if (rad2 > angleRad) rad2 = angleRad;

      point2.x = radius * Math.cos(rad2);
      point2.y = radius * Math.sin(rad2);
      point2.applyMatrix4(matrix);

      segments.push(point1, point2);
    }
  }
}

export { MeasureAngleTool };
