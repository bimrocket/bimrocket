/*
 * OrbitTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
import { Solid } from "../core/Solid.js";
import { GestureHandler } from "../ui/GestureHandler.js";
import * as THREE from "../lib/three.module.js";

class OrbitTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "orbit";
    this.label = "tool.orbit.label";
    this.help = "tool.orbit.help";
    this.className = "orbit";
    this.setOptions(options);

    this.theta = Math.PI;
    this.phi = Math.PI / 2.1;

    this.userZoomSpeed = 1.0;
    this.userRotateSpeed = 1.0;

    this.minPolarAngle = 0; // radians
    this.maxPolarAngle = Math.PI; // radians

    this.rotateButton = 0;
    this.zoomButton = 1;
    this.panButton = 2;

    // Perspective camera
    this.radius = 10;
    this.minRadius = 0.1;
    this.maxRadius = Infinity;

    // Orthographic camera
    this.orthoZoom = 1;
    this.minOrthoZoom = 0.01;
    this.maxOrthoZoom = Infinity;

    this.updateCamera = true;

    // internals
    this.vector = new THREE.Vector3();
    this.center = new THREE.Vector3(); // camera parent CS

    this.EPS = 0.00001;
    this.PIXELS_PER_ROUND = 1800;

    this.rotateStart = new THREE.Vector2();
    this.rotateEnd = new THREE.Vector2();
    this.rotateVector = new THREE.Vector2();

    this.zoomStart = new THREE.Vector2();
    this.zoomEnd = new THREE.Vector2();
    this.zoomVector = new THREE.Vector2();

    this.panStart = new THREE.Vector2();
    this.panEnd = new THREE.Vector2();
    this.panVector = new THREE.Vector2();

    this.phiDelta = 0;
    this.thetaDelta = 0;
    this.zoomDelta = 0;
    this.xDelta = 0;
    this.yDelta = 0;

    this._onWheel = this.onWheel.bind(this);
    this._animate = this.animate.bind(this);
    this._onScene = this.onScene.bind(this);

    const geometry = new THREE.SphereGeometry(1, 8, 8);
    const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.name = THREE.Object3D.HIDDEN_PREFIX + "orbit_center";
    this.sphere = sphere;

    this.createPanel();

    this.gestureHandler = new GestureHandler(this);
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 120;

    I18N.set(this.panel.bodyElem, "textContent", this.help);
  }

  activate()
  {
    this.panel.visible = true;
    this.resetParameters();

    const application = this.application;
    const container = application.container;
    container.addEventListener('wheel', this._onWheel, false);
    application.addEventListener('animation', this._animate);
    application.addEventListener('scene', this._onScene);
    this.gestureHandler.enable();
  }

  deactivate()
  {
    this.panel.visible = false;

    const application = this.application;
    const container = application.container;
    container.removeEventListener('wheel', this._onWheel, false);
    application.removeEventListener('animation', this._animate);
    application.removeEventListener('scene', this._onScene);
    this.gestureHandler.disable();
  }

  animate(event)
  {
    const application = this.application;

    if (!this.updateCamera) return;

    const camera = application.camera;

    this.theta += this.thetaDelta;
    this.phi += this.phiDelta;

    if (camera instanceof THREE.OrthographicCamera)
    {
      let factor = 1 + this.zoomDelta;
      if (factor < 0.1) factor = 0.1;
      else if (factor > 1.5) factor = 1.5;
      this.orthoZoom *= factor;
      if (this.orthoZoom < this.minOrthoZoom)
      {
        this.orthoZoom = this.minOrthoZoom;
      }
      else if (this.orthoZoom > this.maxOrthoZoom)
      {
        this.orthoZoom = this.maxOrthoZoom;
      }
      camera.zoom = this.orthoZoom;
      camera.updateProjectionMatrix();
    }
    else if (camera instanceof THREE.PerspectiveCamera)
    {
      this.radius -= this.radius * this.zoomDelta;
      // restrict radius
      if (this.radius < this.minRadius)
      {
        this.radius = this.minRadius;
      }
      else if (this.radius > this.maxRadius)
      {
        this.radius = this.maxRadius;
      }
    }
    // restrict phi to be between desired limits
    this.phi = Math.max(this.minPolarAngle,
      Math.min(this.maxPolarAngle, this.phi));

    // restrict phi to be between EPS and PI-EPS
    this.phi = Math.max(this.EPS, Math.min(Math.PI - this.EPS, this.phi));

    if (this.xDelta !== 0 || this.yDelta !== 0)
    {
      const matrix = camera.matrix;
      this.center.set(this.xDelta, this.yDelta, -this.radius);
      this.center.applyMatrix4(matrix);
    }

    const vector = this.vector;
    const center = this.center;

    vector.x = Math.sin(this.phi) * Math.sin(this.theta);
    vector.y = Math.sin(this.phi) * Math.cos(this.theta);
    vector.z = Math.cos(this.phi);

    camera.position.copy(center).addScaledVector(vector, this.radius);
    camera.updateMatrix();
    camera.lookAt(center);
    camera.updateMatrix();

    this.thetaDelta = 0;
    this.phiDelta = 0;
    this.zoomDelta = 0;
    this.xDelta = 0;
    this.yDelta = 0;

    application.notifyObjectsChanged(camera, this);

    this.updateCamera = false;
  }

  onScene(event)
  {
    const application = this.application;

    if (event.source !== this)
    {
      const camera = application.camera;

      if (event.type === "nodeChanged" && event.objects.includes(camera))
      {
        this.resetParameters();
      }
      else if (event.type === "cameraActivated")
      {
        this.resetParameters();
      }
    }
  }

  resetParameters()
  {
    const camera = this.application.camera;

    camera.updateMatrix();
    const matrix = camera.matrix;
    const me = matrix.elements;
    const vz = new THREE.Vector3();
    vz.x = me[8];
    vz.y = me[9];
    vz.z = me[10];
    vz.normalize();

    this.phi = Math.acos(vz.z);
    if (Math.abs(vz.x) > 0.01 && Math.abs(vz.y) > 0.01)
    {
      this.theta = Math.atan2(vz.x, vz.y);
    }
    else
    {
      var vx = new THREE.Vector3();
      vx.x = me[0];
      vx.y = me[1];
      vx.z = me[2];
      vx.normalize();
      this.theta = Math.atan2(vx.y, -vx.x);
    }

    if (camera instanceof THREE.PerspectiveCamera)
    {
      this.radius = 10;
    }
    else if (camera instanceof THREE.OrthographicCamera)
    {
      this.orthoZoom = camera.zoom;
    }
    this.center.x = camera.position.x - this.radius * vz.x;
    this.center.y = camera.position.y - this.radius * vz.y;
    this.center.z = camera.position.z - this.radius * vz.z;

    this.updateCamera = true;
  }

  rotateLeft(angle)
  {
    this.thetaDelta += angle;
    this.updateCamera = true;
  }

  rotateRight(angle)
  {
    this.thetaDelta -= angle;
    this.updateCamera = true;
  }

  rotateUp(angle)
  {
    this.phiDelta -= angle;
    this.updateCamera = true;
  }

  rotateDownn(angle)
  {
    this.phiDelta += angle;
    this.updateCamera = true;
  }

  panLeft(delta)
  {
    this.xDelta -= delta;
    this.updateCamera = true;
  }

  panRight(delta)
  {
    this.xDelta += delta;
    this.updateCamera = true;
  };

  panUp(delta)
  {
    this.yDelta -= delta;
    this.updateCamera = true;
  }

  panDown(delta)
  {
    this.yDelta += delta;
    this.updateCamera = true;
  }

  zoomIn(dist)
  {
    this.zoomDelta -= dist;
    this.updateCamera = true;
  }

  zoomOut(dist)
  {
    this.zoomDelta += dist;
    this.updateCamera = true;
  }

  setView(theta, phi)
  {
    this.theta = theta;
    this.phi = phi;
    this.updateCamera = true;
  }

  updateCenter()
  {
    const application = this.application;
    const container = application.container;
    const camera = application.camera;
    const scene = application.scene;

    const centerPosition = new THREE.Vector2();
    centerPosition.x = container.clientWidth / 2;
    centerPosition.y = container.clientHeight / 2;
    const intersect = this.intersect(centerPosition, scene, true);
    if (intersect)
    {
      this.center.copy(intersect.point);
    }
    else
    {
      const centerDistance = this.findCenterDistance();
      const viewVector = new THREE.Vector3();
      viewVector.setFromMatrixColumn(camera.matrix, 2);
      this.center.copy(camera.position);
      this.center.addScaledVector(viewVector, -centerDistance);
    }
    // convert center in WCS to camera parent CS
    camera.parent.worldToLocal(this.center);
    this.radius = this.center.distanceTo(camera.position);
  }

  onStartGesture()
  {
    this.updateCenter();

    // add & update sphere
    const application = this.application;
    application.overlays.add(this.sphere);

    const spherePosition = this.center.clone();
    const camera = application.camera;
    const parentMatrix = camera.parent.matrixWorld;
    spherePosition.applyMatrix4(parentMatrix);
    this.sphere.position.copy(spherePosition);
    let scale;
    if (camera instanceof THREE.PerspectiveCamera)
    {
      scale = this.radius * 0.01;
    }
    else
    {
      scale = 0.005 * (camera.right - camera.left) / camera.zoom;
    }
    this.sphere.scale.set(scale, scale, scale);
    this.sphere.updateMatrix();
    application.notifyObjectsChanged(this.sphere, this);
  }

  onDrag(position, direction, pointerCount, button)
  {
    if (button === this.panButton || pointerCount === 2)
    {
      const camera = this.application.camera;
      const container = this.application.container;

      const vectorcc = new THREE.Vector3();
      vectorcc.x = direction.x / container.clientWidth;
      vectorcc.y = direction.y / container.clientHeight;
      vectorcc.z = 0;

      const matrix = new THREE.Matrix4();
      matrix.copy(camera.projectionMatrix).invert();
      vectorcc.applyMatrix4(matrix);

      let lambda;
      if (camera instanceof THREE.PerspectiveCamera)
      {
        lambda = this.radius / camera.near;
      }
      else
      {
        lambda = 2;
      }
      vectorcc.x *= lambda;
      vectorcc.y *= lambda;
      this.panLeft(vectorcc.x);
      this.panDown(vectorcc.y);
    }
    else if (button === this.rotateButton)
    {
      this.rotateLeft(2 * Math.PI * direction.x /
        this.PIXELS_PER_ROUND * this.userRotateSpeed);
      this.rotateUp(2 * Math.PI * direction.y /
        this.PIXELS_PER_ROUND * this.userRotateSpeed);
    }
    else if (button === this.zoomButton)
    {
      if (direction.y !== 0)
      {
        let absDir = Math.abs(direction.y);

        this.zoomIn(0.002 * Math.sign(direction.y) * Math.pow(absDir, 1.5));
      }
    }
  }

  onZoom(position, delta)
  {
    this.zoomIn(0.005 * delta);
  }

  onEndGesture()
  {
    // remove sphere
    this.application.overlays.remove(this.sphere);
    this.application.notifyObjectsChanged(this.sphere, this);
  }

  onWheel(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();

    let delta = 0;

    if (event.wheelDelta)
    { // WebKit / Opera / Explorer 9
      delta = event.wheelDelta * 0.0005;
    }
    else if (event.detail)
    { // Firefox
      delta = -0.02 * event.detail;
    }

    if (delta !== 0)
    {
      this.zoomIn(delta);
    }
  }

  findCenterDistance()
  {
    const application = this.application;
    const camera = application.camera;
    const objectPosition = new THREE.Vector3();
    const cameraPosition = new THREE.Vector3();
    const viewVector = new THREE.Vector3();
    const cameraObjectVector = new THREE.Vector3();

    camera.getWorldPosition(cameraPosition);
    camera.getWorldDirection(viewVector);
    let minSideDistance = Infinity;
    let minCenterDistance = 0;

    const traverse = object =>
    {
      if (object instanceof Solid
          || object instanceof THREE.Mesh
          || object instanceof THREE.Line)
      {
        object.getWorldPosition(objectPosition);
        cameraObjectVector.subVectors(objectPosition, cameraPosition);
        const objectDistance = cameraObjectVector.length();
        const centerDistance = cameraObjectVector.dot(viewVector);
        if (centerDistance > 0)
        {
          const sideDistance = Math.sqrt(
            objectDistance * objectDistance - centerDistance * centerDistance);
          if (sideDistance < minSideDistance)
          {
            minSideDistance = sideDistance;
            minCenterDistance = centerDistance;
          }
        }
      }
      else
      {
        for (let child of object.children)
        {
          traverse(child);
        }
      }
    };

    traverse(application.baseObject);
    return minCenterDistance === Infinity ? 10 : minCenterDistance;
  }
}

export { OrbitTool };

