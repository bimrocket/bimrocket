/*
 * SelectFacesTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { BoxHandler } from "../ui/BoxHandler.js";
import { Controls } from "../ui/Controls.js";
import { Application } from "../ui/Application.js";
import { Solid } from "../core/Solid.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "three";

class SelectFacesTool extends Tool
{
  static SET_PLANE = "plane";
  static ADD_FACES = "add";
  static REMOVE_FACES = "remove";

  constructor(application, options)
  {
    super(application);
    this.name = "select_faces";
    this.label = "tool.select_faces.label";
    this.className = "select";
    this.setOptions(options);
    application.addTool(this);

    this._onPointerUp = this.onPointerUp.bind(this);

    this.plane = new THREE.Plane();
    this.triangleMap = new Map();

    this.mesh = null;

    this.meshMaterial = new THREE.MeshPhongMaterial({
      color : 0x8080ff,
      name : "face_selection",
      polygonOffset : true,
      polygonOffsetUnits : -2,
      side : THREE.DoubleSide
    });

    this.copyMaterial = new THREE.MeshPhongMaterial({
      color : 0xff8080,
      name : "face_copy",
      polygonOffset : false,
      side : THREE.DoubleSide
    });

    this.planeMaterial = new THREE.LineBasicMaterial({
      name: 'plane_lines',
      color: 0x0,
      linewidth: 1,
      depthTest: false,
      depthWrite: false,
      transparent : true
    });

    this.planeHelper = null;
    this.raycaster = new THREE.Raycaster();

    this.createPanel();

    this.boxHandler = new BoxHandler(this);
    this.boxHandler.onBoxDrawn = (box, event) => this.onBoxDrawn(box, event);
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 160;

    this.panel.onClose = () => this.application.useTool(null);

    this.selectModeElem = Controls.addSelectField(this.panel.bodyElem,
      "select_faces_mode", "label.select_faces_mode",
      [[SelectFacesTool.SET_PLANE, "option.select_faces.select_plane"],
       [SelectFacesTool.ADD_FACES, "option.select_faces.add_faces"],
       [SelectFacesTool.REMOVE_FACES, "option.select_faces.remove_faces"]],
        SelectFacesTool.SET_PLANE);
    this.selectModeElem.style.margin = "4px";

    this.selectModeElem.addEventListener("change", () => this.updateBoxHandler());

    this.angleInputElem = Controls.addNumberField(this.panel.bodyElem,
      "select_faces_angle", "label.select_faces_angle", 20);
    this.angleInputElem.min = 0;
    this.angleInputElem.max = 180;
    this.angleInputElem.style.margin = "4px";

    this.depthInputElem = Controls.addNumberField(this.panel.bodyElem,
      "select_faces_depth", "label.select_faces_depth", 0.5);
    this.depthInputElem.min = 0;
    this.depthInputElem.max = 100;
    this.depthInputElem.style.margin = "4px";

    this.buttonsElem = document.createElement("div");
    this.panel.bodyElem.appendChild(this.buttonsElem);

    this.clearButton = Controls.addButton(this.buttonsElem,
      "select_faces_clear", "button.clear", event => this.clear());
    this.copyButton = Controls.addButton(this.buttonsElem,
      "select_faces_copy", "button.copy", event => this.copy());
  }

  activate()
  {
    this.panel.visible = true;
    const application = this.application;
    const container = application.container;
    container.addEventListener("pointerup", this._onPointerUp, false);
    if (this.mesh &&
        !ObjectUtils.isObjectDescendantOf(this.mesh, application.scene))
    {
      this.clear();
    }
    this.updateBoxHandler();
  }

  deactivate()
  {
    this.panel.visible = false;
    const container = this.application.container;
    container.removeEventListener("pointerup", this._onPointerUp, false);
    this.boxHandler.disable();
  }

  onPointerUp(event)
  {
    const application = this.application;

    if (!application.isCanvasEvent(event)) return;

    event.preventDefault();

    const mode = this.selectModeElem.value;

    if (mode === SelectFacesTool.SET_PLANE) // select plane
    {
      const pointerPosition = application.getPointerPosition(event);
      let intersect = this.intersect(pointerPosition, application.baseObject);
      if (intersect)
      {
        this.updatePlane(intersect);
        this.selectModeElem.value = SelectFacesTool.ADD_FACES;
        this.boxHandler.enable();
      }
    }
  }

  onBoxDrawn(box, event)
  {
    let boxProjected = new THREE.Box2();
    boxProjected.expandByPoint(this.toCamera(box.min));
    boxProjected.expandByPoint(this.toCamera(box.max));

    this.selectFaces(boxProjected, event);
  }

  updateBoxHandler()
  {
    const mode = this.selectModeElem.value;
    if (mode === SelectFacesTool.SET_PLANE)
    {
      this.boxHandler.disable();
    }
    else
    {
      this.boxHandler.enable();
    }
  }

  toCamera(screenPoint)
  {
    const container = this.application.container;
    let pointcc = new THREE.Vector2();
    pointcc.x = (screenPoint.x / container.clientWidth) * 2 - 1;
    pointcc.y = -(screenPoint.y / container.clientHeight) * 2 + 1;
    return pointcc;
  }

  selectFaces(boxProjected, event)
  {
    const application = this.application;
    const baseObject = application.baseObject;
    const triangleMap = this.triangleMap;
    let selectMode;

    if (event.shiftKey)
    {
      selectMode = SelectFacesTool.ADD_FACES;
    }
    else if (event.ctrlKey)
    {
      selectMode = SelectFacesTool.REMOVE_FACES;
    }
    else
    {
      selectMode = this.selectModeElem.value;
    }

    const angle = parseFloat(this.angleInputElem.value); // degrees
    const cosAngle = Math.cos(angle * Math.PI / 180);
    const depth = parseFloat(this.depthInputElem.value);

    const explore = object => {
      if (object.visible)
      {
        if (object instanceof Solid)
        {
          if (object.facesVisible)
          {
            this.selectSolidFaces(object, boxProjected, selectMode, cosAngle, depth);
          }
        }
        else if (object instanceof THREE.Mesh)
        {
          this.selectMeshFaces(object, boxProjected, selectMode, cosAngle, depth);
        }
        else
        {
          for (const child of object.children)
          {
            explore(child);
          }
        }
      }
    };

    explore(baseObject);

    this.updateMeshGeometry();
  }

  selectSolidFaces(solid, box, selectMode, cosAngle, depth)
  {
    const camera = this.application.camera;
    const geometry = solid.geometry;
    const worldVertices = [];
    const cameraVertices = [];
    const objectBox = new THREE.Box2();

    for (let i = 0; i < geometry.vertices.length; i++)
    {
      let worldVertex = new THREE.Vector3();
      worldVertex.copy(geometry.vertices[i]).applyMatrix4(solid.matrixWorld);
      worldVertices.push(worldVertex);

      let cameraVertex = new THREE.Vector3();
      cameraVertex.copy(worldVertex).project(camera);
      cameraVertices.push(cameraVertex);
      objectBox.expandByPoint(cameraVertex);
    }

    if (!box.intersectsBox(objectBox)) return;

    const faces = geometry.faces;
    const cameraTriangle = new THREE.Triangle();
    const worldTriangle = new THREE.Triangle();
    const faceNormal = new THREE.Vector3();
    const planeNormal = this.plane.normal;

    for (let face of faces)
    {
      if (!face.normal) face.updateNormal();
      GeometryUtils.getWorldNormal(face.normal, solid.matrixWorld, faceNormal);

      if (planeNormal.dot(faceNormal) < cosAngle) continue;

      let triangles = face.getTriangles();
      for (let triangle of triangles)
      {
        let i0 = triangle[0];
        let i1 = triangle[1];
        let i2 = triangle[2];

        cameraTriangle.a.copy(cameraVertices[i0]);
        cameraTriangle.b.copy(cameraVertices[i1]);
        cameraTriangle.c.copy(cameraVertices[i2]);

        worldTriangle.a.copy(worldVertices[i0]);
        worldTriangle.b.copy(worldVertices[i1]);
        worldTriangle.c.copy(worldVertices[i2]);

        this.addTriangle(worldTriangle, cameraTriangle, box, selectMode, depth);
      }
    }
  }

  selectMeshFaces(mesh, box, selectMode, cosAngle, depth)
  {
    const camera = this.application.camera;
    const planeNormal = this.plane.normal;
    const vertices = GeometryUtils.getBufferGeometryVertices(mesh.geometry);

    const addFace = (a, b, c) =>
    {
      const va = vertices[a];
      const vb = vertices[b];
      const vc = vertices[c];

      const worldTriangle = new THREE.Triangle();
      const cameraTriangle = new THREE.Triangle();

      worldTriangle.a.copy(va).applyMatrix4(mesh.matrixWorld);
      worldTriangle.b.copy(vb).applyMatrix4(mesh.matrixWorld);
      worldTriangle.c.copy(vc).applyMatrix4(mesh.matrixWorld);

      const triangleNormal = GeometryUtils.calculateNormal(
        [worldTriangle.a, worldTriangle.b, worldTriangle.c]);

      if (planeNormal.dot(triangleNormal) < cosAngle) return;

      cameraTriangle.a.copy(worldTriangle.a).project(camera);
      cameraTriangle.b.copy(worldTriangle.b).project(camera);
      cameraTriangle.c.copy(worldTriangle.c).project(camera);

      this.addTriangle(worldTriangle, cameraTriangle, box, selectMode, depth);
    };
    GeometryUtils.getBufferGeometryFaces(mesh.geometry, addFace);
  }

  addTriangle(worldTriangle, cameraTriangle, box, selectMode, depth)
  {
    if (Math.abs(this.plane.distanceToPoint(worldTriangle.a)) < depth &&
        Math.abs(this.plane.distanceToPoint(worldTriangle.b)) < depth &&
        Math.abs(this.plane.distanceToPoint(worldTriangle.c)) < depth)
    {
      if (this.isTriangleSelected(cameraTriangle, box))
      {
        this.mergeTriangle(worldTriangle.clone(), selectMode);
      }
    }
  }

  mergeTriangle(triangle, selectMode)
  {
    const triangleMap = this.triangleMap;
    const a = triangle.a;
    const b = triangle.b;
    const c = triangle.c;

    let key = a.x + "/" + a.y + "/" + a.z + " " +
              b.x + "/" + b.y + "/" + b.z + " " +
              c.x + "/" + c.y + "/" + c.z;

    if (selectMode === SelectFacesTool.REMOVE_FACES)
    {
      triangleMap.delete(key);
    }
    else
    {
      triangleMap.set(key, triangle);
    }
  }

  updateMeshGeometry()
  {
    const application = this.application;
    const vertices = [];
    const triangleMap = this.triangleMap;

    for (let triangle of triangleMap.values())
    {
      vertices.push(triangle.a);
      vertices.push(triangle.b);
      vertices.push(triangle.c);
    }

    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setFromPoints(vertices);
    bufferGeometry.setIndex(null);
    bufferGeometry.computeVertexNormals();

    if (this.mesh)
    {
      application.removeObject(this.mesh);
    }
    this.mesh = new THREE.Mesh(bufferGeometry, this.meshMaterial);
    this.mesh.raycast = function(){};
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    application.addObject(this.mesh, application.overlays);
  }

  updatePlane(intersect)
  {
    const application = this.application;
    if (this.planeHelper)
    {
      application.removeObject(this.planeHelper);
    }
    const planePoint = intersect.point;
    const normal = intersect.normal;
    const matrixWorld = intersect.object.matrixWorld;
    const worldNormal = GeometryUtils.getWorldNormal(normal, matrixWorld);
    const normalPoint = new THREE.Vector3();
    normalPoint.copy(planePoint).add(worldNormal);

    this.plane.setFromNormalAndCoplanarPoint(worldNormal, planePoint);

    const planeMatrixWorld = new THREE.Matrix4();
    const axisZ = worldNormal;
    const axisX = GeometryUtils.orthogonalVector(axisZ).normalize();
    const axisY = new THREE.Vector3();
    axisY.crossVectors(axisZ, axisX);
    planeMatrixWorld.makeBasis(axisX, axisY, axisZ);
    planeMatrixWorld.setPosition(planePoint);

    const positions = [1, -1, 0, -1,  1, 0,
                      -1, -1, 0,  1,  1, 0,
                      -1,  1, 0, -1, -1, 0,
                       1, -1, 0,  1,  1, 0,
                      -1,  1, 0,  1,  1, 0,
                      -1, -1, 0,  1, -1, 0,
                       0,  0, 0,  0,  0, 1];

		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		geometry.computeBoundingSphere();

    const planeHelper = new THREE.LineSegments(geometry, this.planeMaterial);
    this.planeHelper = planeHelper;

    planeMatrixWorld.decompose(planeHelper.position, planeHelper.rotation, planeHelper.scale);
    planeHelper.updateMatrix();
    planeHelper.raycast = () => {};

    application.overlays.add(planeHelper);

    application.repaint();
  }

  clear()
  {
    if (this.mesh)
    {
      this.application.removeObject(this.mesh);
      this.triangleMap.clear();
      this.mesh = null;
    }

    if (this.planeHelper)
    {
      this.application.removeObject(this.planeHelper);
      this.planeHelper = null;
    }
    this.selectModeElem.value = SelectFacesTool.SET_PLANE;
    this.boxHandler.disable();
  }

  copy()
  {
    const application = this.application;
    const mesh = this.mesh;
    if (mesh)
    {
      const meshCopy = new THREE.Mesh(mesh.geometry, this.copyMaterial);
      meshCopy.name = "faces_" + Date.now();
      meshCopy.castShadow = true;
      meshCopy.receiveShadow = true;
      application.addObject(meshCopy, application.baseObject, true);
    }
  }

  isTriangleSelected(triangle, box)
  {
    const triPoints = [
      new THREE.Vector2(triangle.a.x, triangle.a.y),
      new THREE.Vector2(triangle.b.x, triangle.b.y),
      new THREE.Vector2(triangle.c.x, triangle.c.y)
    ];

    const boxPoints = [
      new THREE.Vector2(box.min.x, box.min.y),
      new THREE.Vector2(box.max.x, box.min.y),
      new THREE.Vector2(box.max.x, box.max.y),
      new THREE.Vector2(box.min.x, box.max.y)
    ];

    const triAxes = this.getPolygonAxes(triPoints);
    const boxAxes = [new THREE.Vector2(1, 0), new THREE.Vector2(0, 1)];

    const axes = [...triAxes, ...boxAxes];

    for (const axis of axes)
    {
      const [minT, maxT] = this.projectPolygon(triPoints, axis);
      const [minB, maxB] = this.projectPolygon(boxPoints, axis);

      if (maxT < minB || maxB < minT)
      {
        return false;
      }
    }
    return true;
  }

  getPolygonAxes(points)
  {
    const axes = [];
    const len = points.length;
    const edge = new THREE.Vector2();

    for (let i = 0; i < len; i++)
    {
      const p1 = points[i];
      const p2 = points[(i + 1) % len];

      edge.subVectors(p2, p1);
      let normal;
      if (Math.abs(edge.y) < 0.0001)
      {
        normal = new THREE.Vector2(edge.y, -edge.x).normalize();
      }
      else
      {
        normal = new THREE.Vector2(-edge.y, edge.x).normalize();
      }
      axes.push(normal);
    }
    return axes;
  }

  projectPolygon(points, axis)
  {
    let min = axis.dot(points[0]);
    let max = min;

    for (let i = 1; i < points.length; i++)
    {
      const projection = axis.dot(points[i]);
      if (projection < min) min = projection;
      if (projection > max) max = projection;
    }
    return [min, max];
  }
}

export { SelectFacesTool };
