/*
 * MeasureAreaTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
import { Controls } from "../ui/Controls.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import * as THREE from "three";

class MeasureAreaTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "measure_area";
    this.label = "tool.measure_area.label";
    this.className = "measure_area";
    this.setOptions(options);
    application.addTool(this);

    this.lineMaterial = new THREE.LineBasicMaterial(
      { linewidth : 2, color : new THREE.Color(0x0000ff), opacity : 1,
        depthTest : false, transparent : true });

    this.pointsMaterial = new THREE.PointsMaterial(
      { color : 0, size : 4, sizeAttenuation : false,
        depthTest : false, transparent : true });

    this.meshMaterial = new THREE.MeshBasicMaterial({
      name: 'MeasureAreaMaterial',
      color: 0xc0c020,
      side: THREE.DoubleSide,
      polygonOffset : true,
      polygonOffsetFactor : -0.1
    });

    this.vertices = []; // Vector3[]
    this.plane = null; // THREE.Plane
    this.line = null; // THREE.Line
    this.points = null; // THREE.Points
    this.mesh = null; // THREE.Mesh

    const manager = application.loadingManager;
    const textureLoader = new THREE.TextureLoader(manager);
    textureLoader.load("textures/area.png", texture =>
    {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1.25, 1.25);
      this.meshMaterial.map = texture;
      this.meshMaterial.needsUpdate = true;
    });

    this._onPointerUp = this.onPointerUp.bind(this);

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 120;

    this.panel.onClose = () => this.application.useTool(null);

    this.helpElem = document.createElement("div");
    this.helpElem.style.padding = "8px";
    this.panel.bodyElem.appendChild(this.helpElem);

    I18N.set(this.helpElem, "textContent", "tool.measure_area.help");

    const resetButton = Controls.addButton(this.panel.bodyElem,
      "clear_area", "button.clear", () => this.clearArea());

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
      this.updateArea();
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
    const vertices = this.vertices;

    let snap = pointSelector.snap;
    if (snap)
    {
      let axisMatrixWorld = snap.object ?
        snap.object.matrixWorld.clone() : new THREE.Matrix4();

      axisMatrixWorld.setPosition(snap.positionWorld);

      let vertex = new THREE.Vector3();
      if (this.plane)
      {
        this.plane.projectPoint(snap.positionWorld, vertex);
      }
      else
      {
        vertex.copy(snap.positionWorld);
      }
      vertices.push(vertex);

      pointSelector.auxiliaryPoints = vertices;
      let count = vertices.length;
      if (count > 1)
      {
        pointSelector.auxiliaryLines.push(
          new THREE.Line3(vertices[count - 2], vertices[count - 1]));
        if (count === 3)
        {
          this.plane = new THREE.Plane();
          this.plane.setFromCoplanarPoints(vertices[0], vertices[1], vertices[2]);
        }
      }
      pointSelector.setAxisGuides(axisMatrixWorld, true);

      this.updateArea();
    }
    else
    {
      pointSelector.clearAxisGuides();
    }
  }

  clearArea()
  {
    const pointSelector = this.application.pointSelector;
    pointSelector.auxiliaryPoints = [];
    pointSelector.auxiliaryLines = [];
    pointSelector.clearAxisGuides();
    this.vertices = [];
    this.plane = null;
    this.updateArea();
  }

  removeLastPoint()
  {
    const pointSelector = this.application.pointSelector;
    const vertices = this.vertices;

    if (vertices.length > 0)
    {
      vertices.pop();
      if (vertices.length < 3) this.plane = null;

      this.updateArea();

      if (vertices.length > 0)
      {
        let lastVertex = vertices[vertices.length - 1];
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

  updateArea()
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

    if (this.mesh !== null)
    {
      application.removeObject(this.mesh);
    }


    const vertices = [...this.vertices];
    if (vertices.length > 2)
    {
      vertices.push(vertices[0]);
    }

    const overlayedObjects = application.addOverlay(vertices, false,
      this.lineMaterial, this.pointsMaterial);

    this.line = overlayedObjects.line;
    this.points = overlayedObjects.points;
    this.mesh = vertices.length > 3 ?
      application.addOverlayArea(vertices, this.meshMaterial) : null;

    application.repaint();

    let area = this.getArea();

    I18N.set(this.distElem, "textContent", "message.measure_area",
      area.toFixed(application.setup.decimals), application.setup.units);
    application.i18n.update(this.distElem);
  }

  getArea()
  {
    if (!this.mesh) return 0;

    const shape = this.mesh.geometry.parameters.shapes;
    const points = shape.getPoints();

    let area = 0;
    for (let i = 0; i < points.length - 1; i++)
    {
      let p1 = points[i];
      let p2 = points[i + 1];

      area += (p1.x * p2.y) - (p2.x * p1.y);
    }
    return Math.abs(0.5 * area);
  }
}

export { MeasureAreaTool };
