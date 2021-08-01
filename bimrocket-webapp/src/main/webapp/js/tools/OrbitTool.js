/*
 * OrbitTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
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
    this.position = new THREE.Vector3(); // camera parent CS
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

    this.viewVector = new THREE.Vector3();

    this.phiDelta = 0;
    this.thetaDelta = 0;
    this.zoomDelta = 0;
    this.xDelta = 0;
    this.yDelta = 0;

    this.STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2 };
    this.state = this.STATE.NONE;

    this._onMouseUp = this.onMouseUp.bind(this);
    this._onMouseDown = this.onMouseDown.bind(this);
    this._onMouseMove = this.onMouseMove.bind(this);
    this._onMouseWheel = this.onMouseWheel.bind(this);
    this._animate = this.animate.bind(this);
    this._onScene = this.onScene.bind(this);
    this._onContextMenu = this.onContextMenu.bind(this);

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 120;

    I18N.set(this.panel.bodyElem, "innerHTML", this.help);
  }

  activate()
  {
    this.panel.visible = true;
    this.resetParameters();

    const application = this.application;
    const container = application.container;

    container.addEventListener('contextmenu', this._onContextMenu, false);
    container.addEventListener('mousedown', this._onMouseDown, false);
    container.addEventListener('mousewheel', this._onMouseWheel, false);
    container.addEventListener('DOMMouseScroll', this._onMouseWheel, false);
    application.addEventListener('animation', this._animate);
    application.addEventListener('scene', this._onScene);
  }

  deactivate()
  {
    this.panel.visible = false;

    const application = this.application;
    const container = application.container;

    container.removeEventListener('contextmenu', this._onContextMenu, false);
    container.removeEventListener('mousedown', this._onMouseDown, false);
    container.removeEventListener('mousewheel', this._onMouseWheel, false);
    container.removeEventListener('DOMMouseScroll', this._onMouseWheel, false);
    application.removeEventListener('animation', this._animate);
    application.removeEventListener('scene', this._onScene);
  }

  animate(event)
  {
    const application = this.application;

    if (!this.updateCamera && !application.needsRepaint) return;

    var camera = application.camera;

    this.theta += this.thetaDelta;
    this.phi += this.phiDelta;

    if (camera instanceof THREE.OrthographicCamera)
    {
      var factor = 1 + this.zoomDelta;
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
      var m = camera.matrix;
      this.center.set(this.xDelta, this.yDelta, -this.radius);
      this.center.applyMatrix4(m);
    }

    var vector = this.vector;
    var position = this.position;
    var center = this.center;

    vector.x = Math.sin(this.phi) * Math.sin(this.theta);
    vector.y = Math.sin(this.phi) * Math.cos(this.theta);
    vector.z = Math.cos(this.phi);

    position.copy(center);
    vector.setLength(this.radius);
    position.add(vector);
    camera.position.copy(position);
    camera.updateMatrix();
    camera.lookAt(center);
    camera.updateMatrix();

    this.thetaDelta = 0;
    this.phiDelta = 0;
    this.zoomDelta = 0;
    this.xDelta = 0;
    this.yDelta = 0;

    var changeEvent = {type: "nodeChanged", objects: [camera], source : this};
    application.notifyEventListeners("scene", changeEvent);

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
    var camera = this.application.camera;

    camera.updateMatrix();
    var matrix = camera.matrix;
    var me = matrix.elements;
    var vz = new THREE.Vector3();
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

    let centerPosition = new THREE.Vector2();
    centerPosition.x = container.clientWidth / 2;
    centerPosition.y = container.clientHeight / 2;
    var intersect = this.intersect(centerPosition, scene, true);
    if (intersect)
    {
      this.center.copy(intersect.point);
    }
    else
    {
      // center = 10 units in front of observer
      this.viewVector.setFromMatrixColumn(camera.matrix, 2);
      this.center.copy(camera.position).addScaledVector(this.viewVector, -10);
    }
    camera.parent.worldToLocal(this.center);
    this.radius = this.center.distanceTo(camera.position);
  }

  onMouseDown(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();

    this.updateCenter();

    var mousePosition = this.getMousePosition(event);
    if (event.button === this.rotateButton)
    {
      this.state = this.STATE.ROTATE;
      this.rotateStart.copy(mousePosition);
    }
    else if (event.button === this.zoomButton)
    {
      this.state = this.STATE.ZOOM;
      this.zoomStart.copy(mousePosition);
    }
    else if (event.button === this.panButton)
    {
      this.state = this.STATE.PAN;
      this.panStart.copy(mousePosition);
    }
    var container = this.application.container;
    container.addEventListener('mousemove', this._onMouseMove, false);
    container.addEventListener('mouseup', this._onMouseUp, false);
  }

  onMouseMove(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();

    var mousePosition = this.getMousePosition(event);
    if (this.state === this.STATE.ROTATE)
    {
      this.rotateEnd.copy(mousePosition);
      this.rotateVector.subVectors(this.rotateEnd, this.rotateStart);

      this.rotateLeft(2 * Math.PI * this.rotateVector.x /
        this.PIXELS_PER_ROUND * this.userRotateSpeed);
      this.rotateUp(2 * Math.PI * this.rotateVector.y /
        this.PIXELS_PER_ROUND * this.userRotateSpeed);

      this.rotateStart.copy(this.rotateEnd);
    }
    else if (this.state === this.STATE.ZOOM)
    {
      this.zoomEnd.copy(mousePosition);
      this.zoomVector.subVectors(this.zoomEnd, this.zoomStart);

      if (this.zoomVector.y !== 0)
      {
        this.zoomIn(0.1 * this.zoomVector.y);
      }
      this.zoomStart.copy(this.zoomEnd);
    }
    else if (this.state === this.STATE.PAN)
    {
      this.panEnd.copy(mousePosition);

      var camera = this.application.camera;
      var container = this.application.container;

      this.panVector.subVectors(this.panEnd, this.panStart);
      var vectorcc = new THREE.Vector3();
      vectorcc.x = this.panVector.x / container.clientWidth;
      vectorcc.y = this.panVector.y / container.clientHeight;
      vectorcc.z = 0;

      var matrix = new THREE.Matrix4();
      matrix.copy(camera.projectionMatrix).invert();
      vectorcc.applyMatrix4(matrix);

      var lambda;
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

      this.panStart.copy(this.panEnd);
    }
  }

  onMouseUp(event)
  {
    this.state = this.STATE.NONE;

    var container = this.application.container;
    container.removeEventListener('mousemove', this._onMouseMove, false);
    container.removeEventListener('mouseup', this._onMouseUp, false);
  }

  onMouseWheel(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();

    var delta = 0;

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

  onContextMenu(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();
  }
}

export { OrbitTool };

