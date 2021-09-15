/*
 * DrawTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class DrawTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "draw";
    this.label = "tool.draw.label";
    this.help = "tool.draw.help";
    this.className = "draw";
    this.setOptions(options);

    this.lastMousePosition = new THREE.Vector2();
    this.startPosition = null;
    this.snapPoint = null;
    this.brepSelector = new BrepSelector();
    this.needsUpdate = false;
    this.line = null;
    this.point = null;

    this._onMouseUp = this.onMouseUp.bind(this);
    this._onMouseMove = this.onMouseMove.bind(this);
    this._onKeyUp = this.onKeyUp.bind(this);
    this._animate = this.animate.bind(this);

    this.lineMaterial = new THREE.LineBasicMaterial(
      {color: 0x0000ff, linewidth: 1.5, depthTest: false});
    this.onAxisXMaterial = new THREE.LineBasicMaterial(
      {color: 0x800000, linewidth: 1.5, depthTest: false});
    this.onAxisYMaterial = new THREE.LineBasicMaterial(
      {color: 0x008000, linewidth: 1.5, depthTest: false});
    this.onAxisZMaterial = new THREE.LineBasicMaterial(
      {color: 0x000080, linewidth: 1.5, depthTest: false});

    this.onVertexMaterial = new THREE.PointsMaterial(
       {color: 0x0000ff, size: 8, sizeAttenuation: false, depthTest: false});
    this.onLineMaterial = new THREE.PointsMaterial(
       {color: 0x006000, size: 8, sizeAttenuation: false, depthTest: false});
    this.onIntersectionMaterial = new THREE.PointsMaterial(
       {color: 0x000000, size: 8, sizeAttenuation: false, depthTest: false});
    this.onFaceMaterial = new THREE.PointsMaterial(
       {color: 0xff0000, size: 8, sizeAttenuation: false, depthTest: false});

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");

    const helpElem = document.createElement("div");
    this.panel.bodyElem.appendChild(helpElem);

    this.posElem = document.createElement("div");
    this.posElem.style.textAlign = "left";
    this.posElem.style.padding = "50px";

    this.panel.bodyElem.appendChild(this.posElem);
  }

  activate = function()
  {
    const application = this.application;
    this.panel.visible = true;
    this._createOverlays();

    var container = application.container;
    container.addEventListener('mouseup', this._onMouseUp, false);
    container.addEventListener('mousemove', this._onMouseMove, false);
    document.addEventListener('keyup', this._onKeyUp, false);
    application.addEventListener('animation', this._animate);

    application.repaint();

    application.hideSelectionLines();
  }

  deactivate()
  {
    const application = this.application;

    this.panel.visible = false;
    this._destroyOverlays();

    this.point.visible = false;
    this.line.visible = false;
    application.repaint();

    var container = application.container;
    container.removeEventListener('mouseup', this._onMouseUp, false);
    container.removeEventListener('mousemove', this._onMouseMove, false);
    document.removeEventListener('keyup', this._onKeyUp, false);
    application.removeEventListener('animation', this._animate);

    application.showSelectionLines();
  }

  onMouseUp(event)
  {
    if (event.button === 0)
    {
      this._enterVertex();
    }
  }

  onMouseMove(event)
  {
    this.lastMousePosition = this.getMousePosition(event);
    this.needsUpdate = true;
  }

  onKeyUp(event)
  {
    if (event.keyCode === 27) // ESC : cancel edge
    {
      this._cancelEdge();
    }
    else if (event.keyCode === 86) // V : enter vertex
    {
      this._enterVertex();
    }
    else if (event.keyCode === 68) // D : remove face, edge or vertex
    {
      this._remove();
    }
    else if (event.keyCode === 70) // F : findFaces
    {
      this._findFaces();
    }
    else if (event.keyCode === 73) // I : inspect
    {
      this._inspect();
    }
    else if (event.keyCode === 32) // SPACE : set edge length
    {
      this._setEdgeLength();
    }
  }

  animate(event)
  {
    if (false && this.needsUpdate)
    {
      const application = this.application;
      var snapPoints = [];

      var container = this.application.container;
      var x = (this.lastMousePosition.x / container.clientWidth) * 2 - 1;
      var y = -(this.lastMousePosition.y / container.clientHeight) * 2 + 1;
      var pixels = 20.0;
      var snap = pixels / container.clientWidth;

      this.brepSelector.select(application.baseObject,
        application.camera, x, y, snap, snapPoints);

      // show point
      if (snapPoints.length > 0)
      {
        // update point vertex
        this.snapPoint = snapPoints[0];
        this.point.geometry.vertices[0].copy(this.snapPoint.position);
        this.point.geometry.verticesNeedUpdate = true;

        var position = this.snapPoint.position;
        this.posElem.innerHTML =
          position.x + "<br>" +
          position.y + "<br>" +
          position.z + "<br>" +
          this.snapPoint.distance;

        // update point material
        var snapType = this.snapPoint.type;
        switch (snapType)
        {
          case VertexSnap:
            this.point.material = this.onVertexMaterial;
            this.point.visible = true;
            break;
          case LinesIntersectionSnap:
          case FaceLineIntersectionSnap:
            this.point.material = this.onIntersectionMaterial;
            this.point.visible = true;
            break;
          case FaceSnap:
            this.point.material = this.onFaceMaterial;
            this.point.visible = true;
            break;
          case GroundSnap:
            this.point.visible = false;
            break;
          default:
            this.point.material = this.onLineMaterial;
            this.point.visible = this.snapPoint.onAxis === null;
        }
      }
      else // intersect with ground
      {
        this.posElem.innerHTML = "";
        this.point.visible = false;
        var groundIntersection = this.intersect(this.lastMousePosition,
          ground, false);
        if (groundIntersection !== null)
        {
          this.snapPoint = new SnapPoint(
             null, GroundSnap, groundIntersection.point);
          this.snapPoint.distance = 0;
        }
        else
        {
          this.snapPoint = null;
        }
      }

      // update line vertices
      this.line.visible = false;
      if (this.startPosition !== null && this.snapPoint !== null)
      {
        this.line.geometry.vertices[0].copy(this.startPosition);
        this.line.geometry.vertices[1].copy(this.snapPoint.position);
        this.line.geometry.verticesNeedUpdate = true;
        this.line.visible = true;

        // update line material
        if (this.snapPoint.onAxis === "X")
        {
          this.line.material = this.onAxisXMaterial;
        }
        else if (this.snapPoint.onAxis === "Y")
        {
          this.line.material = this.onAxisYMaterial;
        }
        else if (this.snapPoint.onAxis === "Z")
        {
          this.line.material = this.onAxisZMaterial;
        }
        else
        {
          this.line.material = this.lineMaterial;
        }
      }
      this.needsUpdate = false;
      application.repaint();
    }
  }

  _createOverlays()
  {
    // overlays
    const application = this.application;
    var overlays = application.overlays;

    var lineGeometry = new THREE.Geometry();
    lineGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
    lineGeometry.vertices.push(new THREE.Vector3(1, 0, 0));
    this.line = new THREE.Line(lineGeometry, this.lineMaterial, THREE.LineStrip);
    this.line.name = "line";
    this.line.matrixAutoUpdate = false;
    this.line.visible = false;
    overlays.add(this.line);

    var pointGeometry = new THREE.Geometry();
    pointGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
    this.point = new THREE.Points(pointGeometry, this.onVertexMaterial);
    this.point.name = "point";
    this.line.matrixAutoUpdate = false;
    this.point.visible = false;
    overlays.add(this.point);
  }

  _destroyOverlays = function()
  {
    const application = this.application;
    var overlays = application.overlays;

    overlays.remove(this.line);
    overlays.remove(this.point);
    application.repaint();
  }

  _addLine(endPosition)
  {
    console.info("=============================================");
    var brep = this._getBrep();
    var startLocal = new THREE.Vector3();
    var endLocal = new THREE.Vector3();

    startLocal.copy(this.startPosition);
    endLocal.copy(endPosition);
    brep.worldToLocal(startLocal);
    brep.worldToLocal(endLocal);

    var edges = brep.geometry.addLine(startLocal, endLocal);
    for (var e = 0; e < edges.length; e++)
    {
      brep.geometry.findFaces(edges[e]);
    }
    this.application.updateBrepGeometry(brep.geometry);

    var vertex = brep.geometry.getVertex(endLocal);
    if (vertex && vertex.edges.length === 1)
    {
      this.startPosition = endPosition.clone();
      this.line.visible = true;
      this.brepSelector.basePoint = endPosition.clone();
    }
    else
    {
      this.startPosition = null;
      this.line.visible = false;
      this.brepSelector.basePoint = null;
    }
    this.needsUpdate = true;
  }

  _remove()
  {
    const application = this.application;
    var brep = this._getBrep();
    if (this.snapPoint !== null && this.snapPoint.brep === brep)
    {
      if (this.snapPoint.face)
      {
        brep.geometry.removeFace(this.snapPoint.face);
        application.updateBrepGeometry(brep.geometry);
        this.startPosition = null;
        this.needsUpdate = true;
      }
      else if (this.snapPoint.edge)
      {
        brep.geometry.removeEdge(this.snapPoint.edge);
        application.updateBrepGeometry(brep.geometry);
        this.startPosition = null;
        this.needsUpdate = true;
      }
      else if (this.snapPoint.vertex)
      {
        var edges = this.snapPoint.vertex.edges.toArray();
        for (var i = 0; i < edges.length; i++)
        {
          brep.geometry.removeEdge(edges[i]);
        }
        application.updateBrepGeometry(brep.geometry);
        this.startPosition = null;
        this.needsUpdate = true;
      }
    }
  }

  _cancelEdge()
  {
    if (this.startPosition !== null)
    {
      this.startPosition = null;
      this.brepSelector.basePoint = null;
      this.needsUpdate = true;
    }
  }

  _setEdgeLength()
  {
    if (this.startPosition !== null && this.snapPoint !== null)
    {
      var endPosition = this.snapPoint.position;
      var distanceText = prompt("Enter edge length:");
      if (distanceText === null)
      {
        endPosition = null;
      }
      else
      {
        var distance = parseFloat(distanceText);
        if ("" + distance === "NaN")
        {
          endPosition = null;
        }
        else
        {
          var vector = new THREE.Vector3();
          vector.subVectors(endPosition, this.startPosition);
          vector.setLength(distance);
          endPosition.copy(this.startPosition).add(vector);
        }
      }
      if (endPosition !== null)
      {
        this._addLine(endPosition);
      }
    }
  }

  _enterVertex()
  {
    if (this.snapPoint !== null)
    {
      if (this.startPosition === null) // first point
      {
        this.startPosition = this.snapPoint.position.clone();
        this.brepSelector.basePoint = this.startPosition.clone();
      }
      else // second point, add edge
      {
        this._addLine(this.snapPoint.position);
      }
    }
  }

  _findFaces()
  {
    if (this.snapPoint !== null && this.startPosition === null)
    {
      var edge = this.snapPoint.edge;
      if (edge !== null)
      {
        var brep = this._getBrep();
        if (this.snapPoint.brep === brep)
        {
          brep.geometry.findFaces(edge);
          this.application.updateBrepGeometry(brep.geometry);
          this.needsUpdate = true;
        }
      }
    }
  }

  _inspect()
  {
    if (this.snapPoint !== null && this.startPosition === null)
    {
      if (this.snapPoint.face)
      {
        console.info(this.snapPoint.face);
      }
      else if (this.snapPoint.edge)
      {
        console.info(this.snapPoint.edge);
      }
      else if (this.snapPoint.vertex)
      {
        console.info(this.snapPoint.vertex);
      }
    }
  }

  _createBrep()
  {
    const application = this.application;
    var geometry = new BrepGeometry();
    var brep = new Brep(geometry,
      Brep.defaultEdgeMaterial, Brep.defaultFaceMaterial);
    return brep;
  }

  _getBrep()
  {
    const application = this.application;
    var brep = null;
    var object = application.selection.object;
    if (object instanceof Brep)
    {
      brep = object;
    }
    else // create new brep
    {
      brep = this._createBrep();
      application.addObject(brep);
    }
    application.hideSelectionLines();
    return brep;
  }
}

export { DrawTool };
