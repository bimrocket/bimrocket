/*
 * SectionTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { Controls } from "../ui/Controls.js";
import { GestureHandler } from "../ui/GestureHandler.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "three";

class SectionTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "section";
    this.label = "tool.section.label";
    this.className = "section";
    this.setOptions(options);

    // section plane parameters
    this.basePoint = new THREE.Vector3(0, 0, 0);
    this.normal = new THREE.Vector3(0, 0, 1);
    this.offset = 0;

    // internal properties
    const plane = new THREE.Plane();
    this.plane = plane;
    this.planes = [this.plane];
    this.noPlanes = [];
    this.meshes = [];

    let backFaceStencilMat = new THREE.MeshBasicMaterial();
    backFaceStencilMat.depthWrite = false;
    backFaceStencilMat.depthTest = false;
    backFaceStencilMat.colorWrite = false;
    backFaceStencilMat.stencilWrite = true;
    backFaceStencilMat.stencilFunc = THREE.AlwaysStencilFunc;
    backFaceStencilMat.side = THREE.BackSide;
    backFaceStencilMat.stencilFail = THREE.IncrementWrapStencilOp;
    backFaceStencilMat.stencilZFail = THREE.IncrementWrapStencilOp;
    backFaceStencilMat.stencilZPass = THREE.IncrementWrapStencilOp;
    backFaceStencilMat.clippingPlanes = this.planes;
    this.backFaceStencilMat = backFaceStencilMat;

    let frontFaceStencilMat = new THREE.MeshBasicMaterial();
    frontFaceStencilMat.depthWrite = false;
    frontFaceStencilMat.depthTest = false;
    frontFaceStencilMat.colorWrite = false;
    frontFaceStencilMat.stencilWrite = true;
    frontFaceStencilMat.stencilFunc = THREE.AlwaysStencilFunc;
    frontFaceStencilMat.side = THREE.FrontSide;
    frontFaceStencilMat.stencilFail = THREE.DecrementWrapStencilOp;
    frontFaceStencilMat.stencilZFail = THREE.DecrementWrapStencilOp;
    frontFaceStencilMat.stencilZPass = THREE.DecrementWrapStencilOp;
    frontFaceStencilMat.clippingPlanes = this.planes;
    this.frontFaceStencilMat = frontFaceStencilMat;

    let sectionColor = application.setup.getItem("sectionColor") || "#808080";

    let planeStencilMat = new THREE.MeshLambertMaterial();
    planeStencilMat.color = new THREE.Color(sectionColor);
    planeStencilMat.emissive = new THREE.Color(0x404040);
    planeStencilMat.side = THREE.DoubleSide;
    planeStencilMat.stencilWrite = true;
    planeStencilMat.flatShading = true;
    planeStencilMat.stencilRef = 0;
    planeStencilMat.stencilFunc = THREE.NotEqualStencilFunc;
    planeStencilMat.stencilFail = THREE.ReplaceStencilOp;
    planeStencilMat.stencilZFail = THREE.ReplaceStencilOp;
    planeStencilMat.stencilZPass = THREE.ReplaceStencilOp;
    const manager = this.application.loadingManager;
    const textureLoader = new THREE.TextureLoader(manager);
    textureLoader.load("textures/section.png", texture =>
    {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(200, 200);
      planeStencilMat.map = texture;
      planeStencilMat.needsUpdate = true;
    });
    this.planeStencilMat = planeStencilMat;

    let planeGeom = new THREE.PlaneGeometry(100, 100);
    let planeMesh = new THREE.Mesh(planeGeom, planeStencilMat);
    planeMesh.renderOrder = 1;
    planeMesh.raycast = () => {};
    planeMesh.name = "sectionPlane";
    this.planeMesh = planeMesh;

    this._onWheel = this.onWheel.bind(this);
    this.createPanel();

    this.sectionColorElem.value = sectionColor;

    this.gestureHandler = new GestureHandler(this);
  }

  createPanel()
  {
    const application = this.application;

    this.panel = application.createPanel(this.label, "left", "panel_section");
    this.panel.preferredHeight = 160;

    this.panel.onHide = () => this.application.useTool(null);

    this.helpElem = document.createElement("div");
    this.panel.bodyElem.appendChild(this.helpElem);

    this.planeTypeSelectElem = Controls.addSelectField(this.panel.bodyElem,
      "section_planes", "label.plane",
      [["z_min", "tool.section.z_min"],
       ["z_max", "tool.section.z_max"],
       ["x_center", "tool.section.x_center"],
       ["y_center", "tool.section.y_center"]]);
    this.planeTypeSelectElem.style.marginLeft = "2px";

    this.planeSelectButton = document.createElement("button");
    this.planeTypeSelectElem.parentElement.appendChild(this.planeSelectButton);
    I18N.set(this.planeSelectButton, "textContent", "button.apply");
    this.planeSelectButton.addEventListener("click",
      event => this.onPlaneSelect());

    this.sectionColorElem = Controls.addColorField(this.panel.bodyElem,
      "section_color", "label.section_color");
    this.sectionColorElem.addEventListener("change", event =>
    {
      let sectionColor = this.sectionColorElem.value;
      application.setup.setItem("sectionColor", sectionColor);
      this.planeStencilMat.color = new THREE.Color(sectionColor);
      application.repaint();
    }, false);

    this.offsetInputElem = Controls.addNumberField(this.panel.bodyElem,
      "section_offset", "label.offset", 0);
    this.offsetInputElem.step = 0.1;
    this.offsetElem = this.offsetInputElem.parentElement;
    this.offsetElem.style.display = "none";

    this.offsetInputElem.addEventListener("change", event =>
    {
      this.offset = parseFloat(this.offsetInputElem.value);
      this.updatePlane();
      application.repaint();
    }, false);

    this.cancelButton = Controls.addButton(this.offsetElem,
      "cancel_section", "button.cancel", event =>
    {
      this.disableClipping();
      this.updatePanel();
      this.application.repaint();
    });

    this.updatePanel();
  }

  activate()
  {
    const application = this.application;
    const container = application.container;
    this.panel.visible = true;
    container.addEventListener("wheel", this._onWheel, false);
    this.gestureHandler.enable();
  }

  deactivate()
  {
    const application = this.application;
    const container = application.container;
    this.panel.visible = false;
    container.removeEventListener("wheel", this._onWheel, false);
    this.gestureHandler.disable();
  }

  onTap(position, button)
  {
    const application = this.application;
    const scene = application.scene;

    const intersect = this.intersect(position, scene, true);
    if (intersect)
    {
      const object = intersect.object;
      let v1 = new THREE.Vector3(0, 0, 0); // local
      let v2 = intersect.face.normal.clone(); // local

      v1.applyMatrix4(object.matrixWorld);
      v2.applyMatrix4(object.matrixWorld);

      this.basePoint.copy(intersect.point); // world
      this.normal.subVectors(v1, v2).normalize(); // world
      this.offset = 0;
      this.updatePlane();

      this.enableClipping();
    }
    else
    {
      this.disableClipping();
    }
    this.updatePanel();
    application.repaint();
  }

  onDrag(position, direction, pointerCount, button)
  {
    const application = this.application;

    if (!application.renderer.localClippingEnabled) return;

    let absDir = Math.abs(direction.y);

    this.offset += 0.005 * Math.sign(direction.y) * Math.pow(absDir, 1.5);

    this.offset = Math.round(1000 * this.offset) / 1000;

    this.updatePlane();
    this.updatePanel();

    application.repaint();
  }

  onWheel(event)
  {
    const application = this.application;

    if (!application.isCanvasEvent(event)) return;

    if (!application.renderer.localClippingEnabled) return;

    let delta = 0;
    if (event.wheelDelta)
    { // WebKit / Opera / Explorer 9
      delta = event.wheelDelta * 0.0005;
    }
    else if (event.detail)
    { // Firefox
      delta = -0.005 * event.detail;
    }
    this.offset += delta;

    this.offset = Math.round(1000 * this.offset) / 1000;

    this.updatePlane();
    this.updatePanel();

    application.repaint();
  }

  onPlaneSelect()
  {
    const application = this.application;
    const camera = application.camera;
    const objects = application.baseObject;

    const box = ObjectUtils.getBoundingBox(objects);
    box.getCenter(this.basePoint);

    let planeType = this.planeTypeSelectElem.value;
    switch (planeType)
    {
      case "z_min":
        this.basePoint.z = box.min.z;
        this.normal.set(0, 0, -1);
        break;
      case "z_max":
        this.basePoint.z = box.max.z;
        this.normal.set(0, 0, -1);
        break;
      case "x_center":
        this.basePoint.x = 0.5 * (box.min.x + box.max.x);
        this.normal.set(1, 0, 0);
        break;
      case "y_center":
        this.basePoint.y = 0.5 * (box.min.y + box.max.y);
        this.normal.set(0, 1, 0);
        break;
    }
    this.offset = 0;
    this.updatePlane();
    this.enableClipping();
    this.updatePanel();
    this.application.repaint();
  }

  enableClipping()
  {
    const application = this.application;
    if (application.renderer.localClippingEnabled) return;

    application.baseObject.traverse(object =>
    {
      let material = object.material;
      if (material && object.visible)
      {
        material.clippingPlanes = this.planes;

        if (object instanceof THREE.Mesh)
        {
          if (object.geometry instanceof SolidGeometry)
          {
            let geometry = object.geometry;
            if (geometry.isManifold && geometry.faces.length >= 4)
            {
              this.meshes.push(object);
            }
          }
        }
      }
    });

    for (let mesh of this.meshes)
    {
      let backMesh = new THREE.Mesh(mesh.geometry, this.backFaceStencilMat);
      backMesh.name = THREE.Object3D.HIDDEN_PREFIX + "backMesh";
      backMesh.raycast = () => {};
      mesh.add(backMesh);
      backMesh.updateMatrix();

      let frontMesh = new THREE.Mesh(mesh.geometry, this.frontFaceStencilMat);
      frontMesh.name = THREE.Object3D.HIDDEN_PREFIX + "frontMesh";
      frontMesh.raycast = () => {};
      mesh.add(frontMesh);
      frontMesh.updateMatrix();
    }

    application.clippingGroup.add(this.planeMesh);
    application.clippingPlane = this.plane;
    application.renderer.localClippingEnabled = true;
  }

  disableClipping()
  {
    const application = this.application;
    if (!application.renderer.localClippingEnabled) return;

    application.clippingGroup.remove(this.planeMesh);
    application.clippingPlane = null;

    for (let mesh of this.meshes)
    {
      let frontMesh = mesh.getObjectByName(
        THREE.Object3D.HIDDEN_PREFIX + "frontMesh");
      if (frontMesh)
      {
        mesh.remove(frontMesh);
      }

      let backMesh = mesh.getObjectByName(
        THREE.Object3D.HIDDEN_PREFIX + "backMesh");
      if (backMesh)
      {
        mesh.remove(backMesh);
      }
    }

    application.baseObject.traverse(object =>
    {
      let material = object.material;
      if (material && object.visible)
      {
        material.clippingPlanes = this.noPlanes;
      }
    });

    this.meshes = [];

    application.renderer.localClippingEnabled = false;
  }

  updatePlane()
  {
    // build section plane from basePoint, normal and offset

    let basePoint = this.basePoint;
    let normal = this.normal;
    let offset = this.offset;

    let position = basePoint.clone().addScaledVector(normal, offset);
    this.plane.setFromNormalAndCoplanarPoint(normal, position);

    let vz = normal;
    let vy = GeometryUtils.orthogonalVector(vz);
    let vx = new THREE.Vector3();
    vx.crossVectors(vy, vz);

    let matrix = new THREE.Matrix4();

    matrix.set(
      vx.x, vy.x, vz.x, position.x,
      vx.y, vy.y, vz.y, position.y,
      vx.z, vy.z, vz.z, position.z,
          0,   0,    0,     1);

    let planeMesh = this.planeMesh;

    matrix.decompose(planeMesh.position, planeMesh.quaternion, planeMesh.scale);

    planeMesh.updateMatrix();
  }

  updatePanel()
  {
    const application = this.application;
    if (application.renderer.localClippingEnabled)
    {
      this.offsetElem.style.display = "block";
      this.offsetInputElem.value = this.offset.toFixed(3);
      this.planeTypeSelectElem.parentElement.style.display = "none";
      I18N.set(this.helpElem, "textContent", "tool.section.offset_plane");
    }
    else
    {
      this.offsetElem.style.display = "none";
      this.planeTypeSelectElem.parentElement.style.display = "";
      I18N.set(this.helpElem, "textContent", "tool.section.select_plane");
    }
    application.i18n.update(this.helpElem);
  }
}

export { SectionTool };
