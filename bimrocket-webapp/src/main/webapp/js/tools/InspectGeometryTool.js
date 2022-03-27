/*
 * InspectGeometryTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Tree } from "../ui/Tree.js";
import { Controls } from "../ui/Controls.js";
import { Solid } from "../core/Solid.js";
import { SolidOptimizer } from "../core/SolidOptimizer.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class InspectGeometryTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "inspect_geometry";
    this.label = "tool.inspect_geometry.label";
    this.className = "inspect_geometry";

    this.object = null;
    this.selectedNode = null;
    this.highlightGroup = null;
    this.lineMaterial = new THREE.LineBasicMaterial(
      { color : 0, linewidth : 1.5, depthTest : false });
    this.pointsMaterial = new THREE.PointsMaterial(
      { color : 0, size: 4, sizeAttenuation : false, depthTest : false });
    this.vertexMaterial = new THREE.PointsMaterial(
      { color : 0x000080, size: 8, sizeAttenuation : false, depthTest : false });

    this.setOptions(options);

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.bodyElem.classList.add("padding");
    this.panel.bodyElem.classList.add("inspect_geometry");

    this.messageElem = document.createElement("div");
    this.panel.bodyElem.appendChild(this.messageElem);
    I18N.set(this.messageElem, "innerHTML", "tool.inspect_geometry.help");

    this.listElem = document.createElement("ul");
    this.listElem.className = "summary";
    this.panel.bodyElem.appendChild(this.listElem);

    this.objectNameElem = document.createElement("li");
    this.listElem.appendChild(this.objectNameElem);

    this.vertexCountElem = document.createElement("li");
    this.listElem.appendChild(this.vertexCountElem);

    this.faceCountElem = document.createElement("li");
    this.listElem.appendChild(this.faceCountElem);

    this.isManifoldElem = document.createElement("li");
    this.listElem.appendChild(this.isManifoldElem);

    this.optimizeButton = Controls.addButton(this.panel.bodyElem,
      "optimize", "button.optimize", () => this.optimize());
    this.optimizeButton.style.display = "none";

    this.geometryTree = new Tree(this.panel.bodyElem);

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onSelection = this.onSelection.bind(this);
  }

  activate()
  {
    const application = this.application;
    const container = application.container;
    container.addEventListener('pointerdown', this._onPointerDown, false);
    application.addEventListener('selection', this._onSelection, false);

    this.panel.visible = true;

    let object = application.selection.object;
    if (object instanceof Solid)
    {
      if (object !== this.object)
      {
        this.showSolid(object);
      }
    }
    else
    {
      this.clear();
    }
  }

  deactivate()
  {
    const application = this.application;
    const container = application.container;
    container.removeEventListener('pointerdown', this._onPointerDown, false);
    application.removeEventListener('selection', this._onSelection, false);

    this.panel.visible = false;
  }

  onPointerDown(event)
  {
    if (!this.isCanvasEvent(event)) return;

    const application = this.application;
    const pointerPosition = this.getEventPosition(event);
    const baseObject = application.baseObject;
    const intersect = this.intersect(pointerPosition, baseObject, true);
    if (intersect)
    {
      let object = intersect.object;
      application.selection.set(object);
    }
    else
    {
      application.selection.clear();
    }
  }

  onSelection()
  {
    const application = this.application;
    const object = application.selection.object;
    if (object instanceof Solid)
    {
      if (object !== this.object)
      {
        this.showSolid(object);
      }
    }
    else
    {
      this.clear();
    }
  }

  showSolid(solid)
  {
    this.object = solid;
    this.clearHighlight();
    this.messageElem.style.display = "none";

    this.listElem.style.display = "";
    I18N.set(this.objectNameElem, "innerHTML", "message.object_name",
      solid.name);
    I18N.set(this.faceCountElem, "innerHTML", "message.face_count",
      solid.geometry.faces.length);
    I18N.set(this.vertexCountElem, "innerHTML", "message.vertex_count",
      solid.geometry.vertices.length);
    I18N.set(this.isManifoldElem, "innerHTML", "message.is_manifold",
      solid.geometry.isManifold);
    this.application.i18n.updateTree(this.listElem);

    this.optimizeButton.style.display = "";

    const tree = this.geometryTree;
    tree.clear();
    let geometry = solid.geometry;
    const vertices = geometry.vertices;

    const round = x =>
    {
      return Math.round(x * 1000) / 1000;
    };

    const vector2String = (vector) =>
    {
      return "(" +round(vector.x) + ", " +
          round(vector.y) + ", " + round(vector.z) + ")";
    };

    const addVertices = (node, loop) =>
    {
      const indices = loop.indices;
      for (let i = 0; i < indices.length; i++)
      {
        let vertex = vertices[loop.indices[i]];
        let vertexNode = node.addNode(
          "v-" + loop.indices[i] + ": " + vector2String(vertex),
          () => this.highlight(vertexNode, solid, [loop], vertex), "vertex");
      }
    };

    for (let f = 0; f < geometry.faces.length; f++)
    {
      let face = geometry.faces[f];
      let label = "face-" + f + " (" + face.outerLoop.indices.length + "v";
      if (face.holes.length > 0) label += ", " + face.holes.length + "h)";
      else label += ")";

      let faceNode = tree.addNode(label,
        () => this.highlight(faceNode, solid,
        [face.outerLoop, ...face.holes]),
        "face" + (face.holes.length > 0 ? " holes" : ""));
      faceNode.addNode("normal: " + vector2String(face.normal),
        () => {}, "normal");

      let outerNode = faceNode.addNode("outerLoop (" +
        face.outerLoop.indices.length + "v)",
        () => this.highlight(outerNode, solid, [face.outerLoop]), "loop");
      addVertices(outerNode, face.outerLoop);
      for (let h = 0; h < face.holes.length; h++)
      {
        let hole = face.holes[h];
        let holeNode = faceNode.addNode("hole-" + h +
          " (" + hole.indices.length + "v)",
          () => this.highlight(holeNode, solid, [hole]), "hole");
        addVertices(holeNode, hole);
      }
    }
  }

  clear()
  {
    this.geometryTree.clear();
    this.object = null;
    this.clearHighlight();
    this.messageElem.style.display = "";
    this.listElem.style.display = "none";
    this.optimizeButton.style.display = "none";
  }

  addLoop(solid, loop)
  {
    const vertices = [];
    const indices = loop.indices;
    const matrixWorld = solid.matrixWorld;

    for (let i = 0; i <= indices.length; i++)
    {
      vertices.push(loop.getVertex(i % indices.length).clone()
        .applyMatrix4(matrixWorld));
    }

    let geometry = new THREE.BufferGeometry();
    geometry.setFromPoints(vertices);

    let lines = new THREE.Line(geometry, this.lineMaterial);
    lines.raycast = function() {};
    this.highlightGroup.add(lines);

    let points = new THREE.Points(geometry, this.pointsMaterial);
    points.raycast = function() {};
    this.highlightGroup.add(points);
  }

  highlight(node, solid, loops, vertex)
  {
    if (this.selectedNode !== null)
    {
      this.selectedNode.removeClass("selected");
    }
    node.addClass("selected");
    this.selectedNode = node;

    if (this.highlightGroup !== null)
    {
      this.application.removeObject(this.highlightGroup);
    }
    this.highlightGroup = new THREE.Group();

    for (let loop of loops)
    {
      this.addLoop(solid, loop);
    }

    if (vertex)
    {
      let geometry = new THREE.BufferGeometry();
      geometry.setFromPoints([vertex.clone().applyMatrix4(solid.matrixWorld)]);
      let points = new THREE.Points(geometry, this.vertexMaterial);
      points.raycast = function() {};
      this.highlightGroup.add(points);
    }

    this.application.addObject(this.highlightGroup, this.application.overlays);
  }

  clearHighlight()
  {
    if (this.highlightGroup !== null)
    {
      this.application.removeObject(this.highlightGroup);
      this.highlightGroup = null;
    }
    if (this.selectedNode !== null)
    {
      this.selectedNode.removeClass("selected");
      this.selectedNode = null;
    }
  }

  optimize()
  {
    const object = this.object;
    if (object !== null && object.type === "Solid")
    {
      let optimizer = new SolidOptimizer(object.geometry);
      let geometry = optimizer.optimize();
      object.updateGeometry(geometry);
      this.showSolid(object);
      this.application.notifyObjectsChanged(object);
      console.info(optimizer);
    }
  }
}

export { InspectGeometryTool };