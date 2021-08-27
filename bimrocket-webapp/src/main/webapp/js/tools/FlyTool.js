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
  static ACTIONS = [
    {
      name : "forward",
      keys : [38], // cursor down
      control: "forwardControl",
      value : 1,
      symbol : "\u2b9d"
    },
    {
      name : "backward",
      keys: [40], // cursor up
      control: "forwardControl",
      value : -1,
      symbol : "\u2b9f"
    },
    {
      name : "rotateLeft",
      keys: [37], // cursor left
      control : "yawControl",
      value : -1,
      symbol : "\u2b9c"
    },
    {
      name : "rotateRight",
      keys: [39], // cursor right
      control : "yawControl",
      value : 1,
      symbol : "\u2b9e"
    },
    {
      name : "ascend",
      keys : [87, 33], // W & page up
      control : "elevationControl",
      value : 1
    },
    {
      name : "descend",
      keys : [83, 34], // S & page down
      control : "elevationControl",
      value : -1
    },
    {
      name : "lookUp",
      keys : [82, 36], // R & home
      control : "pitchControl",
      value : 1
    },
    {
      name : "lookDown",
      keys : [70, 35], // F & end
      control : "pitchControl",
      value : -1
    },
    {
      name : "moveLeft",
      keys : [65, 45], // A & NP 0
      control : "lateralControl",
      value : -1
    },
    {
      name : "moveRight",
      keys : [68, 46], // A & NP 0
      control : "lateralControl",
      value : 1
    }
  ]

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
    this.createKeyMap();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 120;

    this.panel.bodyElem.classList.add("fly_panel");

    const buttonsPanel = document.createElement("div");
    buttonsPanel.className = "buttons";
    this.panel.bodyElem.appendChild(buttonsPanel);

    this.buttons = {};

    for (let action of FlyTool.ACTIONS)
    {
      const button = document.createElement("button");
      button.name = action.name;
      button.innerHTML = action.symbol || String.fromCharCode(action.keys[0]);
      button.className = action.name;
      I18N.set(button, "title", "tool.fly." + action.name);
      I18N.set(button, "alt", "tool.fly." + action.name);
      button.addEventListener("mousedown",
        () => this[action.control] = action.value);
      button.addEventListener("mouseup",
        () => this[action.control] = 0);
      buttonsPanel.appendChild(button);
      this.buttons[action.name] = button;
    }
  }

  createKeyMap()
  {
    this.keyMap = new Map();
    for (let action of FlyTool.ACTIONS)
    {
      for (let key of action.keys)
      {
        this.keyMap[key] = action;
      }
    }
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

    let action = this.keyMap[event.keyCode];
    if (action)
    {
      this[action.control] = action.value;
      this.buttons[action.name].classList.add("pressed");
    }
  }

  onKeyUp(event)
  {
    if (event.srcElement.nodeName.toUpperCase() === "INPUT") return;

    event.preventDefault();

    let action = this.keyMap[event.keyCode];
    if (action)
    {
      this[action.control] = 0;
      this.buttons[action.name].classList.remove("pressed");
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

