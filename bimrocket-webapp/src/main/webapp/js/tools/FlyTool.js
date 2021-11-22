/*
 * FlyTool.js
 *
 * @author realor
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

    // fly options
    this.mode = "buttons";
    this.detectCollision = false;
    this.groundDistanceControlEnabled = false;
    this.groundDistance = 1.7;

    // internals
    this.position = new THREE.Vector3(0, 0, 0);
    this.target = new THREE.Vector3(0, 0, 0);
    this.vector = new THREE.Vector3(0, 0, 0);
    this.raycaster = new THREE.Raycaster();
    this.auxVector = new THREE.Vector3(0, 0, 0);

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

    const keypad = document.createElement("div");
    keypad.className = "keypad";
    this.panel.bodyElem.appendChild(keypad);

    this.subpanels = {};

    for (let subpanelDef of FlyTool.SUBPANELS)
    {
      let subpanelElem = document.createElement("div");
      subpanelElem.className = subpanelDef.name;
      keypad.appendChild(subpanelElem);

      const subpanel = {
        name : subpanelDef.name,
        element : subpanelElem
      };

      this.subpanels[subpanel.name] = subpanel;

      if (subpanelDef.xControl && subpanelDef.yControl)
      {
        subpanel.stick = new Stick(this, subpanel);
        subpanel.xControl = subpanelDef.xControl;
        subpanel.yControl = subpanelDef.yControl;
      }
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
        let onPressed = event =>
        {
          this[action.control] = action.value;
          button.setPointerCapture(event.pointerId);
        };

        let onReleased = event =>
        {
          this[action.control] = 0;
          button.setPointerCapture(event.pointerId);
        };
        button.addEventListener("pointerdown", onPressed);
        button.addEventListener("pointerup", onReleased);
        button.addEventListener("contextmenu", event => event.preventDefault());
      }
      else
      {
        button.addEventListener("click", () => this.onButtonClick(action));
      }
      if (action.subpanel)
      {
        this.subpanels[action.subpanel].element.appendChild(button);
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
      for (let subpanelName in this.subpanels)
      {
        let subpanel = this.subpanels[subpanelName];
        if (subpanel.stick)
        {
          subpanel.stick.activate();
        }
      }
    }
    else // mode === "stick"
    {
      this.mode = "buttons";
      this.panel.bodyElem.classList.remove("stick");
      for (let subpanelName in this.subpanels)
      {
        let subpanel = this.subpanels[subpanelName];
        if (subpanel.stick)
        {
          subpanel.stick.deactivate();
        }
      }
    }
  }

  onKeyDown(event)
  {
    if (event.srcElement.nodeName.toUpperCase() === "INPUT" ||
        event.srcElement.classList.contains("cm-content")) return;

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
    if (action.name === "options")
    {
      const minHeight = 0.5;
      const maxHeight = 10;

      const dialog = new Dialog("tool.fly.options");
      dialog.setClassName("fly_options");
      dialog.setSize(240, 180);
      dialog.addButton("close", "button.close", () =>
      {
        dialog.hide();
      });
      const stickControlElem = dialog.addCheckBoxField("stick",
        "tool.fly.stick_control", this.mode === "stick");

      const detectCollisionElem = dialog.addCheckBoxField("collision",
        "tool.fly.detect_collision", this.detectCollision);

      const groundDistanceControlElem = dialog.addCheckBoxField(
        "ground_control", "tool.fly.ground_distance_control",
        this.groundDistanceControlEnabled);

      const groundDistanceElem = dialog.addNumberField("ground",
        "tool.fly.ground_distance", this.groundDistance, "ground");

      stickControlElem.addEventListener("change",
        () => this.switchMode());

      detectCollisionElem.addEventListener("change",
        () => this.detectCollision = !this.detectCollision);

      groundDistanceControlElem.addEventListener("change", () =>
      {
        this.groundDistanceControlEnabled = !this.groundDistanceControlEnabled;
        groundDistanceElem.disabled = !this.groundDistanceControlEnabled;
      });

      groundDistanceElem.min = minHeight;
      groundDistanceElem.max = maxHeight;
      groundDistanceElem.step = "0.01";

      groundDistanceElem.addEventListener("change", () =>
      {
        let distance = groundDistanceElem.value;
        distance = Math.max(distance, minHeight);
        distance = Math.min(distance, maxHeight);
        this.groundDistance = distance;
        groundDistanceElem.value = distance;
      });

      const unitsText = document.createElement("span");
      unitsText.innerHTML = this.application.units;
      groundDistanceElem.parentElement.appendChild(unitsText);

      groundDistanceElem.disabled = !this.groundDistanceControlEnabled;

      dialog.setI18N(this.application.i18n);
      dialog.show();
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

    let groundDistanceControl = 0;
    if (this.elevationControl === 0 && this.groundDistanceControlEnabled)
    {
      groundDistanceControl = this.groundDistanceControl();
      this.elevationAccel = groundDistanceControl * this.linearAccel;
    }
    else
    {
      this.elevationAccel = this.elevationControl * this.linearAccel;
    }
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

    if (this.elevationControl === 0 && groundDistanceControl === 0)
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

      application.notifyObjectsChanged(camera, this);

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
    const vector = this.auxVector;
    vector.copy(newPosition);
    vector.sub(oldPosition);
    const margin = 0.3;
    const vectorLength = vector.length() + margin;
    vector.normalize();
    const distance = this.measureDistance(oldPosition, vector, vectorLength);
    if (distance !== undefined)
    {
      let stopDistance = distance - margin;
      vector.multiplyScalar(stopDistance);
      newPosition.x = oldPosition.x + vector.x;
      newPosition.y = oldPosition.y + vector.y;
      newPosition.z = oldPosition.z + vector.z;
      return true;
    }
    return false;
  }

  groundDistanceControl()
  {
    const position = this.position;
    const groundVector = this.auxVector;
    const groundDistance = this.groundDistance;
    const margin = 0.01;
    const maxHeight = 100;

    groundVector.set(0, 0, -1);
    const currentGroundDistance =
      this.measureDistance(position, groundVector, maxHeight);
    if (currentGroundDistance !== undefined)
    {
      const targetDistance = currentGroundDistance - groundDistance;
      if (targetDistance > margin)
      {
        if (this.elevationVelocity < 0)
        {
          const stopDistance =
            Math.abs(this.elevationVelocity * this.elevationVelocity /
            (2 * this.linearAccel));
          if (stopDistance + margin > targetDistance) return 1;
        }
        return -1;
      }
      else if (targetDistance < -margin)
      {
        if (this.elevationVelocity > 0)
        {
          const stopDistance =
            Math.abs(this.elevationVelocity * this.elevationVelocity /
            (2 * this.linearAccel));
          if (stopDistance + margin > -targetDistance) return -1;
        }
        return 1;
      }
    }
    return 0;
  }

  measureDistance(origin, unitVector, length)
  {
    const scene = this.application.scene;
    this.raycaster.set(origin, unitVector);
    this.raycaster.far = length;
    const intersects = this.raycaster.intersectObjects(scene.children, true);
    let i = 0;
    let found = false;
    let object = null;
    let intersect = null;
    while (i < intersects.length && !found)
    {
      intersect = intersects[i];
      object = intersect.object;
      if (this.isCollidable(object))
      {
        found = true;
      }
      else i++;
    }
    return found ? intersect.distance : undefined;
  }

  isCollidable(object)
  {
    let collidable = true;
    while (object && collidable)
    {
      collidable = object.visible &&
        (object.userData.collision === undefined ||
        object.userData.collision.enabled);
      object = object.parent;
    }
    return collidable;
  }
}

class Stick
{
  constructor(tool, subpanel)
  {
    this.subpanel = subpanel;
    const element = document.createElement("div");
    this.element = element;
    element.className = "stick";
    element.style.touchAction = "none";
    subpanel.element.style.touchAction = "none";
    subpanel.element.appendChild(element);

    this.onPointerDown = event =>
    {
      subpanel.element.addEventListener("pointermove", this.onPointerMove);
      subpanel.element.setPointerCapture(event.pointerId);

      const control = this.updatePosition(event.clientX, event.clientY);
      tool[subpanel.xControl] = control.x;
      tool[subpanel.yControl] = control.y;
    };

    this.onPointerUp = event =>
    {
      subpanel.element.removeEventListener("pointermove", this.onPointerMove);
      subpanel.element.releasePointerCapture(event.pointerId);

      element.style.left = "";
      element.style.top = "";
      tool[subpanel.xControl] = 0;
      tool[subpanel.yControl] = 0;
    };

    this.onPointerMove = event =>
    {
      let control = this.updatePosition(event.clientX, event.clientY);

      tool[subpanel.xControl] = control.x;
      tool[subpanel.yControl] = control.y;
    };

    subpanel.element.addEventListener("contextmenu",
      event => event.preventDefault());
  }

  activate()
  {
    const subpanel = this.subpanel;
    subpanel.element.addEventListener("pointerdown", this.onPointerDown);
    subpanel.element.addEventListener("pointerup", this.onPointerUp);
  }

  deactivate()
  {
    const subpanel = this.subpanel;
    subpanel.element.removeEventListener("pointerdown", this.onPointerDown);
    subpanel.element.removeEventListener("pointerup", this.onPointerUp);
  }

  updatePosition(clientX, clientY)
  {
    const stickElem = this.element;
    const size = stickElem.offsetWidth;
    const subpanelElem = this.subpanel.element;
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

    stickElem.style.left = -1 + (layerX - 0.5 * size) + "px";
    stickElem.style.top = -1 + (layerY - 0.5 * size) + "px";

    x = x.toFixed(2);
    y = y.toFixed(2);

    return {x, y};
  }
}

export { FlyTool };

