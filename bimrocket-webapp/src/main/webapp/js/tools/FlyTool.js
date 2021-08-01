/*
 * FlyTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class FlyTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "fly";
    this.label = "tool.fly.label";
    this.help = "tool.fly.help";
    this.className = "fly";
    this.setOptions(options);

    this.linearVelocity = 2; // meters/s
    this.angularVelocity = THREE.Math.degToRad(20); // radians/s
    this.linearAccel = 5; // meters/s2
    this.angularAccel = THREE.Math.degToRad(50); // radians/s2
    this.linearDecel = 2; // meters/s2
    this.angularDecel = THREE.Math.degToRad(20); // radians/s2

    this.yaw = 0; // radians (0: north)
    this.pitch = 0; // radians

    this.stopMovement();

    this.detectCollision = false;

    // internals
    this.position = new THREE.Vector3(0, 0, 0);
    this.target = new THREE.Vector3(0, 0, 0);
    this.vector = new THREE.Vector3(0, 0, 0);
    this.raycaster = new THREE.Raycaster();

    this._onKeyUp = this.onKeyUp.bind(this);
    this._onKeyDown = this.onKeyDown.bind(this);
    this._animate = this.animate.bind(this);
    this._onScene = this.onScene.bind(this);

    this.EPS = 0.00001;
    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 120;

    const helpElem = document.createElement("div");
    this.panel.bodyElem.appendChild(helpElem);

    I18N.set(this.panel.bodyElem, "innerHTML", this.help);
  }

  activate()
  {
    this.panel.visible = true;
    this.resetParameters();
    const application = this.application;

    document.addEventListener('keyup', this._onKeyUp, false);
    document.addEventListener('keydown', this._onKeyDown, false);
    application.addEventListener('animation', this._animate);
    application.addEventListener('scene', this._onScene);
  }

  deactivate()
  {
    this.panel.visible = false;
    this.stopMovement();
    const application = this.application;

    document.removeEventListener('keyup', this._onKeyUp, false);
    document.removeEventListener('keydown', this._onKeyDown, false);
    application.removeEventListener('animation', this._animate);
    application.removeEventListener('scene', this._onScene);
  }

  stopMovement()
  {
    this.forwardControl = 0;
    this.forwardAccel = 0;
    this.forwardVelocity = 0;

    this.lateralControl = 0;
    this.lateralAccel = 0;
    this.lateralVelocity = 0;

    this.elevationControl = 0;
    this.elevationAccel = 0;
    this.elevationVelocity = 0;

    this.yawControl = 0;
    this.yawAccel = 0;
    this.yawVelocity = 0;

    this.pitchControl = 0;
    this.pitchAccel = 0;
    this.pitchVelocity = 0;
  }

  onKeyDown(event)
  {
    if (event.srcElement.nodeName.toUpperCase() === "INPUT") return;

    event.preventDefault();

    switch (event.keyCode)
    {
      case 38: /* cursor up */
        this.forwardControl = 1;
        break;
      case 40: /* cursor down */
        this.forwardControl = -1;
        break;

      case 90: /* Z */
      case 45: /* NP 0 */
        this.lateralControl = -1;
        break;
      case 88: /* X */
      case 46: /* NP . */
        this.lateralControl = 1;
        break;

      case 82: /* R */
      case 33: /* Page up */
        this.elevationControl = 1;
        break;
      case 70: /* F */
      case 34: /* Page down */
        this.elevationControl = -1;
        break;

      case 37: /* cursor left */
        this.yawControl = -1;
        break;
      case 39: /* cursor right */
        this.yawControl = 1;
        break;

      case 69: /* E */
      case 36: /* Home */
        this.pitchControl = 1;
        break;
      case 68: /* D */
      case 35: /* End */
        this.pitchControl = -1;
        break;
      case 107: /* + */
        this.linearVelocity *= 2;
        this.angularVelocity *= 2;
        this.linearAccel *= 2;
        this.angularAccel *= 2;
        this.linearDecel *= 2;
        this.angularDecel *= 2;
        break;
      case 109: /* - */
        this.linearVelocity *= 0.5;
        this.angularVelocity *= 0.5;
        this.linearAccel *= 0.5;
        this.angularAccel *= 0.5;
        this.linearDecel *= 0.5;
        this.angularDecel *= 0.5;
        break;
    }
  }

  onKeyUp(event)
  {
    if (event.srcElement.nodeName.toUpperCase() === "INPUT") return;

    event.preventDefault();

    switch (event.keyCode)
    {
      case 38: /* cursor up */
      case 40: /* cursor down */
        this.forwardControl = 0;
        break;

      case 90: /* Z */
      case 88: /* X */
      case 45: /* NP 0 */
      case 46: /* NP . */
        this.lateralControl = 0;
        break;

      case 82: /* R */
      case 70: /* F */
      case 33: /* Page up */
      case 34: /* Page down */
        this.elevationControl = 0;
        break;

      case 37: /* cursor left */
      case 39: /* cursor right */
        this.yawControl = 0;
        break;

      case 69: /* E */
      case 68: /* D */
      case 35: /* End */
      case 36: /* Home */
        this.pitchControl = 0;
        break;
    }
  }

  animate(event)
  {
    const delta = event.delta;
    const application = this.application;
    const camera = application.camera;

    this.forwardAccel = this.forwardControl * this.linearAccel;
    if (this.forwardVelocity > 0)
    {
      this.forwardAccel -= this.linearDecel;
    }
    else if (this.forwardVelocity < 0)
    {
      this.forwardAccel += this.linearDecel;
    }

    this.lateralAccel = this.lateralControl * this.linearAccel;
    if (this.lateralVelocity > 0)
    {
      this.lateralAccel -= this.linearDecel;
    }
    else if (this.lateralVelocity < 0)
    {
      this.lateralAccel += this.linearDecel;
    }

    this.elevationAccel = this.elevationControl * this.linearAccel;
    if (this.elevationVelocity > 0)
    {
      this.elevationAccel -= this.linearDecel;
    }
    else if (this.elevationVelocity < 0)
    {
      this.elevationAccel += this.linearDecel;
    }

    this.yawAccel = this.yawControl * this.angularAccel;
    if (this.yawVelocity > 0)
    {
      this.yawAccel -= this.angularDecel;
    }
    else if (this.yawVelocity < 0)
    {
      this.yawAccel += this.angularDecel;
    }

    this.pitchAccel = this.pitchControl * this.angularAccel;
    if (this.pitchVelocity > 0)
    {
      this.pitchAccel -= this.angularDecel;
    }
    else if (this.pitchVelocity < 0)
    {
      this.pitchAccel += this.angularDecel;
    }

    this.forwardVelocity += this.forwardAccel * delta;
    this.lateralVelocity += this.lateralAccel * delta;
    this.elevationVelocity += this.elevationAccel * delta;
    this.yawVelocity += this.yawAccel * delta;
    this.pitchVelocity += this.pitchAccel * delta;

    if (this.forwardControl === 0)
    {
      if (this.forwardAccel > 0 && this.forwardVelocity > 0 ||
          this.forwardAccel < 0 && this.forwardVelocity < 0)
      {
        this.forwardAccel = 0;
        this.forwardVelocity = 0;
      }
    }

    if (this.lateralControl === 0)
    {
      if (this.lateralAccel > 0 && this.lateralVelocity > 0 ||
          this.lateralAccel < 0 && this.lateralVelocity < 0)
      {
        this.lateralAccel = 0;
        this.lateralVelocity = 0;
      }
    }

    if (this.elevationControl === 0)
    {
      if (this.elevationAccel > 0 && this.elevationVelocity > 0 ||
          this.elevationAccel < 0 && this.elevationVelocity < 0)
      {
        this.elevationAccel = 0;
        this.elevationVelocity = 0;
      }
    }

    if (this.yawControl === 0)
    {
      if (this.yawAccel > 0 && this.yawVelocity > 0 ||
          this.yawAccel < 0 && this.yawVelocity < 0)
      {
        this.yawAccel = 0;
        this.yawVelocity = 0;
      }
    }

    if (this.pitchControl === 0)
    {
      if (this.pitchAccel > 0 && this.pitchVelocity > 0 ||
          this.pitchAccel < 0 && this.pitchVelocity < 0)
      {
        this.pitchAccel = 0;
        this.pitchVelocity = 0;
      }
    }

    var residualMove = 0.00001;

    if (this.updateCamera ||
        Math.abs(this.yawVelocity) > residualMove ||
        Math.abs(this.pitchVelocity) > residualMove ||
        Math.abs(this.forwardVelocity) > residualMove ||
        Math.abs(this.lateralVelocity) > residualMove ||
        Math.abs(this.elevationVelocity) > residualMove)
    {
      this.yaw += this.yawVelocity * delta;
      this.pitch += this.pitchVelocity * delta;

      if (this.pitch <= -0.5 * Math.PI)
      {
        this.pitch = -0.5 * Math.PI + this.EPS;
        this.pitchVelocity = 0;
        this.pitchAccel = 0;
      }
      else if (this.pitch >= 0.5 * Math.PI)
      {
        this.pitch = 0.5 * Math.PI - this.EPS;
        this.pitchVelocity = 0;
        this.pitchAccel = 0;
      }

      var sinYaw = Math.sin(this.yaw);
      var cosYaw = Math.cos(this.yaw);
      var sinPitch = Math.sin(this.pitch);
      var cosPitch = Math.cos(this.pitch);

      var position = camera.position;
      this.position.copy(position);

      var me = camera.matrixWorld.elements;
      var scale = this.vector.set(me[8], me[9], me[10]).length();

      position.x += this.forwardVelocity * sinYaw * delta / scale;
      position.y += this.forwardVelocity * cosYaw * delta / scale;
      position.z += this.elevationVelocity * delta / scale;

      camera.translateX(this.lateralVelocity * delta / scale);

      if (this.detectCollision && !this.position.equals(position))
      {
        if (this.collide(this.position, position))
        {
          this.stop();
        }
      }

      this.target.x = position.x + 100 * cosPitch * sinYaw;
      this.target.y = position.y + 100 * cosPitch * cosYaw;
      this.target.z = position.z + 100 * sinPitch;

      camera.updateMatrix();
      camera.lookAt(this.target);
      camera.updateMatrix();

      var changeEvent = {type: "nodeChanged", objects: [camera], source : this};
      application.notifyEventListeners("scene", changeEvent);

      this.updateCamera = false;
    }
  }

  onScene(event)
  {
    if ((event.type === "nodeChanged" || event.type === "cameraActivated") &&
      event.objects.includes(this.application.camera) && event.source !== this)
    {
      this.resetParameters();
    }
  }

  resetParameters()
  {
    const application = this.application;
    const container = application.container;
    const camera = application.camera;
    if (camera instanceof THREE.PerspectiveCamera)
    {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    }

    camera.updateMatrix();
    var matrix = camera.matrix;
    var me = matrix.elements;
    var vz = new THREE.Vector3();
    vz.x = me[8];
    vz.y = me[9];
    vz.z = me[10];
    vz.normalize();

    this.pitch = Math.asin(-vz.z);
    if (Math.abs(vz.x) > 0.01 && Math.abs(vz.y) > 0.01)
    {
      this.yaw = Math.atan2(-vz.x, -vz.y);
    }
    else
    {
      var vx = new THREE.Vector3();
      vx.x = me[0];
      vx.y = me[1];
      vx.z = me[2];
      vx.normalize();
      this.yaw = Math.atan2(-vx.y, vx.x);
    }
    this.updateCamera = true;
  }

  stop()
  {
    this.forwardControl = 0;
    this.forwardAccel = 0;
    this.forwardVelocity = 0;

    this.lateralControl = 0;
    this.lateralAccel = 0;
    this.lateralVelocity = 0;

    this.elevationControl = 0;
    this.elevationAccel = 0;
    this.elevationVelocity = 0;

    this.yawControl = 0;
    this.yawAccel = 0;
    this.yawVelocity = 0;

    this.pitchControl = 0;
    this.pitchAccel = 0;
    this.pitchVelocity = 0;
  }

  collide(oldPosition, newPosition)
  {
    var scene = this.application.scene;
    var vector = new THREE.Vector3();
    vector.copy(newPosition);
    vector.sub(oldPosition);
    var vectorLength = vector.length();
    this.raycaster.set(oldPosition, vector.divideScalar(vectorLength));
    var margin = 0.3;
    this.raycaster.far = vectorLength + margin;
    var intersects = this.raycaster.intersectObjects(scene.children, true);
    var i = 0;
    var found = false;
    var object = null;
    var intersect = null;
    while (i < intersects.length && !found)
    {
      intersect = intersects[i];
      object = intersect.object;
      if (object.visible) found = true;
      else i++;
    }
    if (found)
    {
      var distance = intersect.distance;
      var stopDistance = distance - margin;
      vector.multiplyScalar(stopDistance);
      newPosition.x = oldPosition.x + vector.x;
      newPosition.y = oldPosition.y + vector.y;
      newPosition.z = oldPosition.z + vector.z;
      return true;
    }
    return false;
  }
}

export { FlyTool };

