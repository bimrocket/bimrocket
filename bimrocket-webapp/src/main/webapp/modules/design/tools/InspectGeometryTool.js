/*
 * InspectGeometryTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { Tree } from "platform/ui/tree/Tree.js";
import { TabbedPane } from "platform/ui/tabbedpane/TabbedPane.js";
import { Controls } from "platform/ui/Controls.js";
import { Solid } from "platform/core/Solid.js";
import { SolidOptimizer } from "platform/core/SolidOptimizer.js";
import { ObjectUtils } from "platform/utils/ObjectUtils.js";
import { I18N } from "platform/i18n/I18N.js";
import * as THREE from "three";

class InspectGeometryTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "inspect_geometry";
    this.label = "design|tool.inspect_geometry.label";
    this.className = "inspect-geometry";
    this.iconName = "design|inspect-geometry";

    this.lineMaterial = new THREE.LineBasicMaterial(
      { color : 0, linewidth : 1.5, depthTest : false, transparent : true });
    this.pointsMaterial = new THREE.PointsMaterial(
      { color : 0, size: 4, sizeAttenuation : false, depthTest : false,
        transparent : true });
    this.vertexMaterial = new THREE.PointsMaterial(
      { color : 0x000080, size: 8, sizeAttenuation : false, depthTest : false,
        transparent : true });

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.sceneUuid = null;
    this.object = null;
    this.selectedNode = null;
    this.highlightGroup = null;

    this.createPanel();

    this._onSelection = this.onSelection.bind(this);
  }

  createPanel()
  {
    const application = this.application;
    const container = application.container;

    this.panel = this.application.createToolPanel(this)
      .setDefaultHeight(200)
      .setDefaultMobileHeight(200)
      .setMinimumHeight(140)
      .setPriority(3);

    this.panel.bodyElem.classList.add("padding");

    this.tabbedPane = new TabbedPane(this.panel.bodyElem);

    const geometryInventoryPanel =
      this.tabbedPane.addTab("geom_inventory", "design|label.geometry_inventory");
    geometryInventoryPanel.classList.add(this.className);

    const geometryPanel = this.tabbedPane.addTab("geom_detail",
      "design|label.geometry_detail");
    geometryPanel.classList.add("inspect-geometry");

    // geometry inventory panel
    this.geometryToDisplayElem = Controls.addNumberField(geometryInventoryPanel,
      "geom_to_display", "design|label.geometries_display", "100", "row");
    this.geometryToDisplayElem.style.width = "60px";

    this.searchButton = Controls.addButton(geometryInventoryPanel,
      "geom_search", "button.search", () => this.searchGeometries());

    this.listInvElem = document.createElement("ul");
    this.listInvElem.className = "summary";
    geometryInventoryPanel.appendChild(this.listInvElem);

    this.geometryCountElem = document.createElement("li");
    this.listInvElem.appendChild(this.geometryCountElem);

    this.instanceCountElem = document.createElement("li");
    this.listInvElem.appendChild(this.instanceCountElem);

    this.modeledTriangleCountElem = document.createElement("li");
    this.listInvElem.appendChild(this.modeledTriangleCountElem);

    this.renderedTriangleCountElem = document.createElement("li");
    this.listInvElem.appendChild(this.renderedTriangleCountElem);

    this.listInvElem.style.display = "none";

    this.geometryTable = Controls.addTable(geometryInventoryPanel, "geom_table",
      ["design|label.geometry_id",
       "design|label.geometry_instances",
       "design|label.geometry_triangles",
       "design|label.geometry_total_triangles"], "data");

    this.geometryTable.style.display = "none";

    // geometry panel
    this.messageElem = document.createElement("div");
    this.messageElem.style.padding = "4px";
    geometryPanel.appendChild(this.messageElem);
    I18N.set(this.messageElem, "textContent", "design|tool.inspect_geometry.help");

    this.listElem = document.createElement("ul");
    this.listElem.className = "summary";
    geometryPanel.appendChild(this.listElem);

    this.objectNameElem = document.createElement("li");
    this.listElem.appendChild(this.objectNameElem);

    this.geometryIdElem = document.createElement("li");
    this.listElem.appendChild(this.geometryIdElem);

    this.vertexCountElem = document.createElement("li");
    this.listElem.appendChild(this.vertexCountElem);

    this.faceCountElem = document.createElement("li");
    this.listElem.appendChild(this.faceCountElem);

    this.isManifoldElem = document.createElement("li");
    this.listElem.appendChild(this.isManifoldElem);

    this.optimizeButton = Controls.addButton(geometryPanel,
      "optimize", "design|button.optimize", () => this.optimize());
    this.optimizeButton.style.display = "none";

    this.geometryTree = new Tree(geometryPanel);

    this.panel.onShow = () =>
    {
      application.addEventListener('selection', this._onSelection, false);
    };

    this.panel.onHide = () =>
    {
      application.removeEventListener('selection', this._onSelection, false);
      this.clearHighlight();
    };
  }

  execute()
  {
    const application = this.application;

    if (this.sceneUuid !== application.scene.uuid)
    {
      this.listInvElem.style.display = "none";
      this.geometryTable.tBodies[0].innerHTML = "";
      this.geometryTable.style.display = "none";
    }

    this.panel.visible = true;

    let object = application.selection.object;
    if (object instanceof Solid)
    {
      this.showSolid(object);
      this.tabbedPane.showTab("geom_detail");
    }
    else
    {
      this.clear();
      this.tabbedPane.showTab("geom_inventory");
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
      this.tabbedPane.showTab("geom_detail");
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

    const formatter = new Intl.NumberFormat();

    this.listElem.style.display = "";
    I18N.set(this.objectNameElem, "textContent", "design|message.object_name",
      solid.name);
    I18N.set(this.geometryIdElem, "textContent", "design|message.geometry_id",
      solid.geometry.id);
    I18N.set(this.faceCountElem, "textContent", "design|message.face_count",
      formatter.format(solid.geometry.faces.length));
    I18N.set(this.vertexCountElem, "textContent", "design|message.vertex_count",
      formatter.format(solid.geometry.vertices.length));
    I18N.set(this.isManifoldElem, "textContent", "design|message.is_manifold",
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

    this.application.addOverlay(vertices, false,
      this.lineMaterial, this.pointsMaterial, this.highlightGroup);
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
    this.highlightGroup.name = "geometryHighlight";
    this.highlightGroup.renderOrder = 2;

    for (let loop of loops)
    {
      this.addLoop(solid, loop);
    }

    if (vertex)
    {
      this.application.addOverlay(
        [vertex.clone().applyMatrix4(solid.matrixWorld)],
        false, null, this.vertexMaterial, this.highlightGroup);
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
    }
  }

  searchGeometries()
  {
    const application = this.application;
    this.sceneUuid = application.scene.uuid;
    let geometryMap = new Map();
    let instanceCount = 0;
    let modeledTriangleCount = 0;
    let renderedTriangleCount = 0;

    function traverse(object)
    {
      if (!object.visible) return;

      if (object instanceof Solid)
      {
        let geometry = object.geometry;
        let entry = geometryMap.get(geometry.id);
        if (entry === undefined)
        {
          entry =
          {
            geometry : geometry,
            triangleCount : geometry.getTriangleCount(),
            instances : []
          };
          geometryMap.set(geometry.id, entry);
          modeledTriangleCount += entry.triangleCount;
        }
        entry.instances.push(object);
        instanceCount++;
        renderedTriangleCount += entry.triangleCount;
      }
      else
      {
        const children = object.children;
        for (let child of children)
        {
          traverse(child);
        }
      }
    }

    traverse(application.baseObject);

    let entries = Array.from(geometryMap.values());
    entries.sort((a, b) =>
    {
      let sizeA = a.triangleCount * a.instances.length;
      let sizeB = b.triangleCount * b.instances.length;
      return sizeB - sizeA;
    });

    const formatter = new Intl.NumberFormat();

    this.listInvElem.style.display = "";
    I18N.set(this.geometryCountElem, "textContent",
      "design|message.geometry_count", formatter.format(entries.length));
    I18N.set(this.instanceCountElem, "textContent",
      "design|message.instance_count", formatter.format(instanceCount));
    I18N.set(this.modeledTriangleCountElem, "textContent",
      "design|message.modeled_triangle_count",
      formatter.format(modeledTriangleCount));
    I18N.set(this.renderedTriangleCountElem, "textContent",
      "design|message.rendered_triangle_count",
      formatter.format(renderedTriangleCount));
    this.application.i18n.updateTree(this.listInvElem);

    this.geometryTable.tBodies[0].innerHTML = "";

    let entryCount =
      Math.min(entries.length, parseInt(this.geometryToDisplayElem.value));

    for (let i = 0; i < entryCount; i++)
    {
      let entry = entries[i];
      let rowElem = Controls.addTableRow(this.geometryTable);
      rowElem.children[0].textContent = entry.geometry.id;
      let instanceLink = document.createElement("a");
      instanceLink.href = "#";
      instanceLink.textContent = "" + formatter.format(entry.instances.length);
      instanceLink.addEventListener("click", () => this.showInstances(entry));
      rowElem.children[1].appendChild(instanceLink);
      rowElem.children[2].textContent = formatter.format(entry.triangleCount);
      rowElem.children[3].textContent =
        formatter.format(entry.triangleCount * entry.instances.length);
    }
    this.geometryTable.style.display = "";
  }

  showInstances(entry)
  {
    this.application.selection.set(...entry.instances);
  }
}

export { InspectGeometryTool };