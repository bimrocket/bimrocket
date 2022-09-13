/*
 * SectionTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import { Controls } from "../ui/Controls.js";
import { GestureHandler } from "../ui/GestureHandler.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class SectionTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "section";
    this.label = "tool.section.label";
    this.help = "tool.section.help";
    this.className = "section";
    this.setOptions(options);

    var plane = new THREE.Plane();
    this.plane = plane;
    this.planes = [this.plane];
    this.noPlanes = [];
    this.basePoint = null;
    this.offset = 0;
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

    let sectionColor =
      window.localStorage.getItem("bimrocket.sectionColor");
    if (sectionColor === null)
      sectionColor = "#808080";

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

    const helpElem = document.createElement("div");
    this.panel.bodyElem.appendChild(helpElem);

    this.sectionColorElem = Controls.addColorField(this.panel.bodyElem,
      "section_color", "label.section_color");
    this.sectionColorElem.addEventListener("change", event =>
    {
      let sectionColor = this.sectionColorElem.value;
      window.localStorage.setItem("bimrocket.sectionColor", sectionColor);
      this.planeStencilMat.color = new THREE.Color(sectionColor);
      application.repaint();
    }, false);

    this.offsetInputElem = Controls.addNumberField(this.panel.bodyElem,
      "section_offset", "label.offset", 0);
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
        this.updateOffsetLabel();
        this.application.repaint();
      });
    I18N.set(helpElem, "innerHTML", this.help);
  }

  activate()
  {
    this.panel.visible = true;
    const container = this.application.container;
    container.addEventListener('wheel', this._onWheel, false);
    this.gestureHandler.enable();
  }

  deactivate()
  {
    this.panel.visible = false;
    const container = this.application.container;
    container.removeEventListener('wheel', this._onWheel, false);
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
      this.basePoint = intersect.point; // world
      let v1 = new THREE.Vector3(0, 0, 0); // local
      let v2 = intersect.face.normal.clone(); // local

      v1.applyMatrix4(object.matrixWorld);
      v2.applyMatrix4(object.matrixWorld);

      const normal = new THREE.Vector3().subVectors(v1, v2).normalize();
      this.plane.normal = normal;
      this.offset = 0;
      this.updatePlane();

      this.enableClipping();
    }
    else
    {
      this.disableClipping();
    }
    this.updateOffsetLabel();
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
    this.updateOffsetLabel();

    application.repaint();
  }

  onWheel(event)
  {
    if (!this.isCanvasEvent(event)) return;

    const application = this.application;

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
    this.updateOffsetLabel();

    application.repaint();
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

    for (let i = 0; i < this.meshes.length; i++)
    {
      let mesh = this.meshes[i];

      let backMesh = new THREE.Mesh(mesh.geometry, this.backFaceStencilMat);
      backMesh.name = THREE.Object3D.HIDDEN_PREFIX + "backMesh";
      backMesh.raycast = () => {};
      mesh.add(backMesh);
      backMesh.updateMatrix();

      let frontMesh = new THREE.Mesh(mesh.geometry, this.frontFaceStencilMat);
      frontMesh.name = THREE.Object3D.HIDDEN_PREFIX + "frontMesh";
      frontMesh.raycast = function(){};
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

    for (let i = 0; i < this.meshes.length; i++)
    {
      const mesh = this.meshes[i];

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
    this.basePoint = null;

    application.renderer.localClippingEnabled = false;
  }

  updatePlane()
  {
    let planeMesh = this.planeMesh;
    let normal = this.plane.normal;

    let position = this.basePoint.clone().addScaledVector(normal, this.offset);
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

    matrix.decompose(planeMesh.position, planeMesh.quaternion, planeMesh.scale);

    planeMesh.updateMatrix();
  }

  updateOffsetLabel()
  {
    if (this.application.renderer.localClippingEnabled)
    {
      this.offsetElem.style.display = "block";
      this.offsetInputElem.value = this.offset.toFixed(3);
    }
    else
    {
      this.offsetElem.style.display = "none";
    }
  }
}

export { SectionTool };
