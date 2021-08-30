/*
 * FlyTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";
import { Dialog } from "../ui/Dialog.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class FlyTool extends Tool
{
  static SUBPANELS = [
    {
      name : "leftWheel",
      xControl : "lateralControl",
      yControl : "elevationControl"
    },
    {
      name : "pitchPanel"
    },
    {
      name: "rightWheel",
      xControl : "yawControl",
      yControl : "forwardControl"
    }
  ];

  static ACTIONS = [
    {
      name : "ascend",
      subpanel : "leftWheel",
      keys : [87, 33], // W & page up
      control : "elevationControl",
      value : 1
    },
    {
      name : "descend",
      subpanel : "leftWheel",
      keys : [83, 34], // S & page down
      control : "elevationControl",
      value : -1
    },
    {
      name : "moveLeft",
      subpanel : "leftWheel",
      keys : [65, 45], // A & NP 0
      control : "lateralControl",
      value : -1
    },
    {
      name : "moveRight",
      subpanel : "leftWheel",
      keys : [68, 46], // A & NP 0
      control : "lateralControl",
      value : 1
    },
    {
      name : "lookUp",
      subpanel : "pitchPanel",
      keys : [82, 36], // R & home
      control : "pitchControl",
      value : 1
    },
    {
      name : "lookDown",
      subpanel : "pitchPanel",
      keys : [70, 35], // F & end
      control : "pitchControl",
      value : -1
    },
    {
      name : "forward",
      subpanel : "rightWheel",
      keys : [38], // cursor down
      control: "forwardControl",
      value : 1,
      text : "" // use background image
    },
    {
      name : "backward",
      subpanel : "rightWheel",
      keys: [40], // cursor up
      control: "forwardControl",
      value : -1,
      text : ""
    },
    {
      name : "rotateLeft",
      subpanel : "rightWheel",
      keys: [37], // cursor left
      control : "yawControl",
      value : -1,
      text : ""
    },
    {
      name : "rotateRight",
      subpanel : "rightWheel",
      keys: [39], // cursor right
      control : "yawControl",
      value : 1,
      text : ""
    },
    {
      name : "options"
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
    this._onWheelDown = this.onWheelDown.bind(this);
    this._onWheelUp = this.onWheelUp.bind(this);
    this._onWheelMove = this.onWheelMove.bind(this);
    this._animate = this.animate.bind(this);
    this._onScene = this.onScene.bind(this);

    this.mode = "buttons";

    this.EPS = 0.00001;
    this.createPanel();
    this.createKeyMap();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 120;

    this.panel.bodyElem.classList.add("fly_panel");

    const keypad = document.createElement("div");
    keypad.className = "keypad";
    this.panel.bodyElem.appendChild(keypad);

    this.subpanels = {};

    for (let subpanelName in FlyTool.SUBPANELS)
    {
      let subpanel = FlyTool.SUBPANELS[subpanelName];
      subpanel.active = false;
      let subpanelElem = document.createElement("div");
      subpanelElem.className = subpanel.name;
      keypad.appendChild(subpanelElem);
      if (subpanel.xControl)
      {
        const stick = document.createElement("div");
        stick.className = "stick";
        subpanel.stick = stick;
        subpanelElem.appendChild(stick);
      }
      this.subpanels[subpanel.name] = subpanelElem;
    }

    this.buttons = {};

    for (let action of FlyTool.ACTIONS)
    {
      const button = document.createElement("button");
      button.name = action.name;
      let text = action.text;
      if (text === undefined)
      {
        if (action.keys)
        {
          text = String.fromCharCode(action.keys[0]);
        }
        else
        {
          text = "";
        }
      }
      button.innerHTML = text;
      button.className = action.name;
      I18N.set(button, "title", "tool.fly." + action.name);
      I18N.set(button, "alt", "tool.fly." + action.name);
      if (action.control)
      {
        let onPressed = () => this[action.control] = action.value;
        let onReleased = () => this[action.control] = 0;
        button.addEventListener("mousedown", onPressed);
        button.addEventListener("mouseup", onReleased);
        button.addEventListener("mouseout", onReleased);
        button.addEventListener("touchstart", onPressed);
        button.addEventListener("touchend", onReleased);
      }
      else
      {
        button.addEventListener("click", () => this.onButtonClick(action));
      }
      if (action.subpanel)
      {
        this.subpanels[action.subpanel].appendChild(button);
      }
      else
      {
        keypad.appendChild(button);
      }
      this.buttons[action.name] = button;
    }
  }

  createKeyMap()
  {
    this.keyMap = new Map();
    for (let action of FlyTool.ACTIONS)
    {
      if (action.keys)
      {
        for (let key of action.keys)
        {
          this.keyMap[key] = action;
        }
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

  switchMode()
  {
    if (this.mode === "buttons")
    {
      this.mode = "stick";
      this.panel.bodyElem.classList.add("stick");
      for (let subpanel of FlyTool.SUBPANELS)
      {
        if (subpanel.xControl)
        {
          let subpanelElem = this.subpanels[subpanel.name];
          subpanelElem.addEventListener("mousedown", this._onWheelDown);
          subpanelElem.addEventListener("touchstart", this._onWheelDown);
        }
      }
      document.addEventListener("mouseup", this._onWheelUp);
      document.addEventListener("touchend", this._onWheelUp);
      document.addEventListener("mousemove", this._onWheelMove);
      document.addEventListener("touchmove", this._onWheelMove);
    }
    else // mode === "stick"
    {
      this.mode = "buttons";
      this.panel.bodyElem.classList.remove("stick");
      for (let subpanel of FlyTool.SUBPANELS)
      {
        if (subpanel.xControl)
        {
          let subpanelElem = this.subpanels[subpanel.name];
          subpanelElem.removeEventListener("mousedown", this._onWheelDown);
          subpanelElem.removeEventListener("touchstart", this._onWheelDown);
        }
      }
      document.removeEventListener("mouseup", this._onWheelUp);
      document.removeEventListener("touchend", this._onWheelUp);
      document.removeEventListener("mousemove", this._onWheelMove);
      document.removeEventListener("touchmove", this._onWheelMove);
    }
  }

  onKeyDown(event)
  {
    if (event.srcElement.nodeName.toUpperCase() === "INPUT") return;

    event.preventDefault();

    let action = this.keyMap[event.keyCode];
    if (action)
    {
      this[action.control] = action.value;
      let button = this.buttons[action.name];
      button.classList.add("pressed");
      button.focus();
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
      let button = this.buttons[action.name];
      button.classList.remove("pressed");
    }
  }

  onButtonClick(action)
  {
    const dialog = new Dialog("tool.fly.options");
    dialog.setSize(200, 140);
    dialog.addButton("close", "button.close", () =>
    {
      dialog.hide();
    });
    const stickControl = dialog.addCheckBoxField("stick",
      "tool.fly.stick_control", this.mode === "stick");

    const detectCollision = dialog.addCheckBoxField("collision",
      "tool.fly.detect_collision", this.detectCollision);

    stickControl.addEventListener("change",
      () => this.switchMode());

    detectCollision.addEventListener("change",
      () => this.detectCollision = !this.detectCollision);

    dialog.setI18N(this.application.i18n);
    dialog.show();
  }

  onWheelDown(event)
  {
    let positions = this.getEventPositions(event);
    for (let position of positions)
    {
      const subpanel = this.findSubpanel(position.x, position.y, false);
      if (subpanel)
      {
        subpanel.active = true;
        const control = this.updateStickPosition(
          position.x, position.y, subpanel);
        this[subpanel.xControl] = control.x;
        this[subpanel.yControl] = control.y;
      }
    }
  }

  onWheelUp(event)
  {
    let positions = this.getEventPositions(event);
    for (let position of positions)
    {
      const subpanel = this.findSubpanel(position.x, position.y, true);
      if (subpanel)
      {
        subpanel.active = false;
        const stick = subpanel.stick;
        stick.style.left = "";
        stick.style.top = "";
        this[subpanel.xControl] = 0;
        this[subpanel.yControl] = 0;
      }
    }
  }

  onWheelMove(event)
  {
    let positions = this.getEventPositions(event);
    for (let position of positions)
    {
      const subpanel = this.findSubpanel(position.x, position.y, true);
      if (subpanel)
      {
        const control = this.updateStickPosition(
          position.x, position.y, subpanel);
        this[subpanel.xControl] = control.x;
        this[subpanel.yControl] = control.y;
      }
    }
  }

  updateStickPosition(clientX, clientY, subpanel)
  {
    const stick = subpanel.stick;
    const size = stick.offsetWidth;
    const subpanelElem = this.subpanels[subpanel.name];
    const rect = subpanelElem.getBoundingClientRect();

    let layerX = clientX - rect.left;
    let layerY = clientY - rect.top;

    let x = 2 * (layerX / rect.width) - 1;
    let y = -2 * (layerY / rect.height) + 1;

    let radius = (rect.width - size) / rect.width;

    if (Math.sqrt(x * x + y * y) > radius)
    {
      let angle = Math.atan2(y, x);
      x = radius * Math.cos(angle);
      y = radius * Math.sin(angle);
      layerX = (x + 1) * 0.5 * rect.width;
      layerY = (1 - y) * 0.5 * rect.height;
    }

    subpanel.stick.style.left = -1 + (layerX - 0.5 * size) + "px";
    subpanel.stick.style.top = -1 + (layerY - 0.5 * size) + "px";

    x = x.toFixed(2);
    y = y.toFixed(2);

    return {x, y};
  }

  findSubpanel(clientX, clientY, active = false)
  {
    let minDist = 0;
    let closest = null;
    for (let subpanel of FlyTool.SUBPANELS)
    {
      if (subpanel.stick && subpanel.active === active)
      {
        let stick = subpanel.stick;
        let rect = stick.getBoundingClientRect();
        let layerX = clientX - rect.left;
        let layerY = clientY - rect.top;

        let dist = Math.sqrt(layerX * layerX + layerY * layerY);
        if (closest === null)
        {
          closest = subpanel;
          minDist = dist;
        }
        else
        {
          if (dist < minDist)
          {
            minDist = dist;
            closest = subpanel;
          }
        }
      }
    }
    return closest;
  }

  getEventPositions(event)
  {
    const positions = [];

    if (event instanceof MouseEvent)
    {
      positions.push({ x : event.clientX, y : event.clientY });
    }
    else if (event instanceof TouchEvent)
    {
      let touches = event.changedTouches;
      for (let touch of touches)
      {
        positions.push({ x : touch.clientX, y : touch.clientY });
      }
    }
    return positions;
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

    const residualMove = 0.00001;

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

      const sinYaw = Math.sin(this.yaw);
      const cosYaw = Math.cos(this.yaw);
      const sinPitch = Math.sin(this.pitch);
      const cosPitch = Math.cos(this.pitch);

      const position = camera.position;
      this.position.copy(position);

      const me = camera.matrixWorld.elements;
      const scale = this.vector.set(me[8], me[9], me[10]).length();

      position.x += this.forwardVelocity * sinYaw * delta / scale;
      position.y += this.forwardVelocity * cosYaw * delta / scale;
      position.z += this.elevationVelocity * delta / scale;

      camera.translateX(this.lateralVelocity * delta / scale);

      if (this.detectCollision && !this.position.equals(position))
      {
        if (this.collide(this.position, position))
        {
          this.stopMovement();
        }
      }

      this.target.x = position.x + 100 * cosPitch * sinYaw;
      this.target.y = position.y + 100 * cosPitch * cosYaw;
      this.target.z = position.z + 100 * sinPitch;

      camera.updateMatrix();
      camera.lookAt(this.target);
      camera.updateMatrix();

      const changeEvent = {type: "nodeChanged", objects: [camera],
        source : this};
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
    const matrix = camera.matrix;
    const me = matrix.elements;
    const vz = new THREE.Vector3();
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
      const vx = new THREE.Vector3();
      vx.x = me[0];
      vx.y = me[1];
      vx.z = me[2];
      vx.normalize();
      this.yaw = Math.atan2(-vx.y, vx.x);
    }
    this.updateCamera = true;
  }

  collide(oldPosition, newPosition)
  {
    const scene = this.application.scene;
    const vector = new THREE.Vector3();
    vector.copy(newPosition);
    vector.sub(oldPosition);
    const vectorLength = vector.length();
    this.raycaster.set(oldPosition, vector.divideScalar(vectorLength));
    const margin = 0.3;
    this.raycaster.far = vectorLength + margin;
    const intersects = this.raycaster.intersectObjects(scene.children, true);
    let i = 0;
    let found = false;
    let object = null;
    let intersect = null;
    while (i < intersects.length && !found)
    {
      intersect = intersects[i];
      object = intersect.object;
      if (object.visible) found = true;
      else i++;
    }
    if (found)
    {
      let distance = intersect.distance;
      let stopDistance = distance - margin;
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

