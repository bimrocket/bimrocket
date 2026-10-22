/*
 * LinesSelectionHighlighter.js
 *
 * @author realor
 */

import { Application } from "platform/ui/Application.js";
import { SelectionHighlighter } from "platform/ui/SelectionHighlighter.js";
import { DirectionHelper } from "platform/ui/DirectionHelper.js";
import { LineDashedShaderMaterial } from "platform/materials/LineDashedShaderMaterial.js";
import { ObjectUtils } from "platform/utils/ObjectUtils.js";
import * as THREE from "three";

class LinesSelectionHighlighter extends SelectionHighlighter
{
  constructor(application, options)
  {
    super(application, options);
    this.application = application;
    this.options = {...options};
    this._selectionLines = null;

    /* selection materials */

    this.selectionColor =
      this.options.selectionColor || new THREE.Color(0, 0, 1);
  }

  update()
  {
    this.hideSelectionLines();
    this.showSelectionLines();
    this.application.repaint();
  }

  set selectionColor(color)
  {
    super.selectionColor = color;

    this.selectionMaterial?.dispose();
    this.deepSelectionMaterial?.dispose();
    this.invisibleSelectionMaterial?.dispose();
    this.deepInvisibleSelectionMaterial?.dispose();
    this.boxSelectionMaterial?.dispose();

    this.selectionMaterial = new THREE.LineBasicMaterial(
      { color, linewidth: 1.5,
        depthTest: true, depthWrite: true, transparent: true });

    this.deepSelectionMaterial = new THREE.LineBasicMaterial(
      { color, linewidth: 1.5,
        depthTest: false, depthWrite: false, transparent: true });

    this.boxSelectionMaterial = new THREE.LineBasicMaterial(
      { color, linewidth: 1.5,
        depthTest: true, depthWrite: true });

    this.invisibleSelectionMaterial = new LineDashedShaderMaterial(
      { color, dashSize: 4, gapSize: 4,
        depthTest: true, depthWrite: true });

    this.deepInvisibleSelectionMaterial = new LineDashedShaderMaterial(
      { color, dashSize: 4, gapSize: 4,
        depthTest: false, depthWrite: false, transparent : true });
  }

  hideSelectionLines()
  {
    const application = this.application;
    if (this._selectionLines !== null)
    {
      application.overlays.remove(this._selectionLines);
      ObjectUtils.dispose(this._selectionLines);
      this._selectionLines = null;
    }
  }

  showSelectionLines()
  {
    const application = this.application;
    if (this._selectionLines === null && !application.selection.isEmpty())
    {
      const linesGroup = new THREE.Group();
      linesGroup.renderOrder = 1;
      linesGroup.name = "SelectionLines";
      const iterator = application.selection.iterator;
      let item = iterator.next();
      while (!item.done)
      {
        let object = item.value;
        this.collectLines(object, linesGroup, true);
        item = iterator.next();
      }
      this._selectionLines = linesGroup;
      application.overlays.add(this._selectionLines);
    }
  }

  transformSelectionLines(matrix)
  {
    if (this._selectionLines !== null)
    {
      const lines = this._selectionLines;
      matrix.decompose(lines.position, lines.quaternion, lines.scale);
      lines.updateMatrix();
      this.application.repaint();
    }
  }

  collectLines(object, linesGroup, isRoot)
  {
    const application = this.application;

    const highlight = ObjectUtils.getSelectionHighlight(object)
          || ObjectUtils.HIGHLIGHT_EDGES;
    if (highlight === ObjectUtils.HIGHLIGHT_NONE) return;

    let material = this.getSelectionMaterial(object);

    if (object instanceof Solid)
    {
      let solid = object;

      if (!isRoot && !solid.edgesVisible && !solid.facesVisible) return;

      if (application.setup.selectionPaintMode === Application.EDGES_SELECTION)
      {
        let edgesGeometry = solid.edgesGeometry;
        if (edgesGeometry)
        {
          let lines = new THREE.LineSegments(edgesGeometry, material);

          lines.name = "SelectionLines";
          lines.raycast = function(){};

          solid.updateMatrixWorld();
          solid.matrixWorld.decompose(
            lines.position, lines.rotation, lines.scale);
          lines.updateMatrix();
          linesGroup.add(lines);
        }
      }
      else // show faces (triangles)
      {
        let geometry = solid.geometry;
        if (geometry)
        {
          let edgesGeometry = geometry.getTrianglesGeometry();

          let lines = new THREE.LineSegments(edgesGeometry, material);
          lines.name = "SelectionLines";
          lines.raycast = function(){};

          solid.updateMatrixWorld();
          solid.matrixWorld.decompose(
            lines.position, lines.rotation, lines.scale);
          lines.updateMatrix();
          linesGroup.add(lines);
        }
      }
    }
    else if (object instanceof THREE.Camera)
    {
      let camera = object;
      if (camera !== application.camera)
      {
        camera.updateMatrixWorld();
        let helper = new DirectionHelper(1);
        camera.matrixWorld.decompose(
          helper.position, helper.rotation, helper.scale);
        helper.updateMatrix();

        helper.name = "CameraLines";
        helper.raycast = function(){};
        linesGroup.add(helper);
      }
    }
    else if (object instanceof THREE.DirectionalLight)
    {
      let light = object;
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.LineBasicMaterial(
      { color: 0x000000 });

      const helper = new THREE.Line(geometry, material);
      helper.name = "DirectionalLightLines";

      light.updateWorldMatrix(true, false);
      light.target.updateWorldMatrix(true, false);

      const p1 = new THREE.Vector3();
      const p2 = new THREE.Vector3();

      light.getWorldPosition(p1);
      light.target.getWorldPosition(p2);

      geometry.setFromPoints([p1, p2]);

      linesGroup.add(helper);
    }
    else if (object instanceof THREE.Mesh)
    {
      let mesh = object;

      if (mesh.geometry.attributes?.position?.array?.length >
          Application.LARGE_MESH_SIZE)
      {
        let box = ObjectUtils.getLocalBoundingBox(mesh, true);
        if (!box.isEmpty())
        {
          let geometry = ObjectUtils.getBoxGeometry(box);

          let lines = new THREE.LineSegments(geometry, mesh.visible ?
            this.boxSelectionMaterial : material);
          lines.raycast = function(){};

          mesh.updateMatrixWorld();
          mesh.matrixWorld.decompose(
            lines.position, lines.rotation, lines.scale);
          lines.updateMatrix();
          linesGroup.add(lines);
        }
      }
      else
      {
        mesh.updateMatrixWorld();
        let edgesGeometry = new THREE.EdgesGeometry(mesh.geometry);

        let lines = new THREE.LineSegments(edgesGeometry, material);
        lines.raycast = function(){};
        lines.name = "OuterLines";
        mesh.matrixWorld.decompose(
          lines.position, lines.rotation, lines.scale);
        lines.updateMatrix();
        linesGroup.add(lines);
      }
    }
    else if (object instanceof THREE.Points)
    {
      object.updateMatrixWorld();

      let box = ObjectUtils.getLocalBoundingBox(object, true);
      if (!box.isEmpty())
      {
        let geometry = ObjectUtils.getBoxGeometry(box);

        let lines = new THREE.LineSegments(geometry, object.visible ?
          application.boxSelectionMaterial : material);
        lines.raycast = function(){};

        object.matrixWorld.decompose(
          lines.position, lines.rotation, lines.scale);
        lines.updateMatrix();
        linesGroup.add(lines);
      }
    }
    else if (object instanceof Cord)
    {
      object.updateMatrixWorld();

      let lines = new THREE.LineSegments(object.geometry, material);
      lines.raycast = function(){};
      lines.name = "Lines";
      object.matrixWorld.decompose(
        lines.position, lines.rotation, lines.scale);
      lines.updateMatrix();
      linesGroup.add(lines);
    }
    else if (object instanceof Profile)
    {
      object.updateMatrixWorld();

      let lines = new THREE.LineSegments(object.geometry, material);
      lines.raycast = function(){};
      lines.name = "Lines";
      object.matrixWorld.decompose(
        lines.position, lines.rotation, lines.scale);
      lines.updateMatrix();
      linesGroup.add(lines);
    }
    else if (object instanceof THREE.Group || object instanceof THREE.Object3D)
    {
      object.updateMatrixWorld();

      if (highlight === ObjectUtils.HIGHLIGHT_EDGES)
      {
        let children = object.children;
        for (let i = 0; i < children.length; i++)
        {
          var child = children[i];
          this.collectLines(child, linesGroup, false);
        }
      }
      else if (highlight === ObjectUtils.HIGHLIGHT_BOX)
      {
        let box = ObjectUtils.getLocalBoundingBox(object, true);
        if (!box.isEmpty())
        {
          let geometry = ObjectUtils.getBoxGeometry(box);

          let lines = new THREE.LineSegments(geometry, object.visible ?
            this.boxSelectionMaterial : material);
          lines.raycast = function(){};

          object.matrixWorld.decompose(
            lines.position, lines.rotation, lines.scale);
          lines.updateMatrix();
          linesGroup.add(lines);
        }
      }
    }
  }

  getSelectionMaterial(object)
  {
    const setup = this.application.setup;
    if (object.visible)
    {
      return setup.showDeepSelection ?
        this.deepSelectionMaterial : this.selectionMaterial;
    }
    else
    {
      return setup.showDeepSelection ?
        this.deepInvisibleSelectionMaterial : this.invisibleSelectionMaterial;
    }
  }
}

export { LinesSelectionHighlighter };

