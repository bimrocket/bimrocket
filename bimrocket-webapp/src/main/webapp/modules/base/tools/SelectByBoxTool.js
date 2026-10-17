/*
 * SelectByBoxTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { Controls } from "platform/ui/Controls.js";
import { Application } from "platform/ui/Application.js";
import { BoxHandler } from "platform/ui/BoxHandler.js";
import { Solid } from "platform/core/Solid.js";
import { Profile } from "platform/core/Profile.js";
import { Cord } from "platform/core/Cord.js";
import { Text2D } from "platform/core/Text2D.js";
import { GeometryUtils } from "platform/utils/GeometryUtils.js";
import { I18N } from "platform/i18n/I18N.js";
import * as THREE from "three";

class SelectByBoxTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "select_by_box";
    this.label = "base|tool.select_by_box.label";
    this.help = "base|tool.select_by_box.help";
    this.className = "select-by-box";
    this.iconName = "base|select-by-box";

    this.setOptions(options);
    application.addTool(this);

    this._boxHandler = new BoxHandler(this);
    this._boxHandler.onBoxDrawn = (box, event) => this.onBoxDrawn(box, event);
    this._boxHandler.isEnabledForEvent = event => true;

    this._pointerDownTime = 0;

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onContextMenu = this.onContextMenu.bind(this);

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createToolPanel(this)
      .setDefaultHeight(120)
      .setDefaultMobileHeight(120)
      .setMinimumHeight(80);

    const helpElem = document.createElement("div");
    I18N.set(helpElem, "textContent", this.help);
    helpElem.style.margin = "4px 0 4px 0";
    this.panel.bodyElem.appendChild(helpElem);

    this.selectModeElem = Controls.addRadioButtons(this.panel.bodyElem,
      "selection_mode", "base|label.selection_mode",
      [[Application.SET_SELECTION_MODE, "base|label.set_selection_mode"],
       [Application.ADD_SELECTION_MODE, "base|label.add_selection_mode"],
       [Application.REMOVE_SELECTION_MODE, "base|label.remove_selection_mode"]],
      Application.SET_SELECTION_MODE, "selection_mode", () =>
      {
        this.application.selectionMode = this.selectModeElem.value;
      });
  }

  activate()
  {
    this.panel.visible = true;
    this._boxHandler.enable();
    const container = this.application.container;
    container.addEventListener("pointerdown", this._onPointerDown, false);
    container.addEventListener("contextmenu", this._onContextMenu, false);
    this.selectModeElem.setValue(this.application.selectionMode);
  }

  deactivate()
  {
    this.panel.visible = false;
    this._boxHandler.disable();
    const container = this.application.container;
    container.removeEventListener("pointerdown", this._onPointerDown, false);
    container.removeEventListener("contextmenu", this._onContextMenu, false);
  }

  onPointerDown(event)
  {
    const application = this.application;
    if (!application.isCanvasEvent(event)) return;

    if (application.contextMenu.isVisible()) return;

    this._pointerDownTime = Date.now();
  }

  onContextMenu(event)
  {
    const application = this.application;
    if (!application.isCanvasEvent(event)) return;

    event.preventDefault();
  }

  onBoxDrawn(box, event)
  {
    const application = this.application;

    let boxProjected = new THREE.Box2();
    boxProjected.expandByPoint(this.toCamera(box.min));
    boxProjected.expandByPoint(this.toCamera(box.max));

    const selection = [];
    this.selectObjects(boxProjected, selection);

    let showContextMenu = false;

    let ellapsed = Date.now() - this._pointerDownTime;
    if (selection.length === 0 && (ellapsed > 500 || event.button > 0))
    {
      showContextMenu = true;
    }
    else
    {
      application.userSelectObjects(selection, event);
    }

    if (event.button > 0)
    {
      showContextMenu = true;
    }
    if (showContextMenu) this.application.contextMenu.show(event);
  }

  toCamera(screenPoint)
  {
    const container = this.application.container;
    let pointcc = new THREE.Vector2();
    pointcc.x = (screenPoint.x / container.clientWidth) * 2 - 1;
    pointcc.y = -(screenPoint.y / container.clientHeight) * 2 + 1;
    return pointcc;
  }

  selectObjects(boxProjected, selection)
  {
    const application = this.application;
    const baseObject = application.baseObject;
    const zeroPoint = new THREE.Vector3();

    const explore = object =>
    {
      if (object.visible)
      {
        if (object instanceof Solid)
        {
          if (object.facesVisible || object.edgesVisible)
          {
            const geometry = object.geometry;
            const vertices = geometry.vertices;
            this.selectObject(object, vertices, boxProjected, selection);
          }
        }
        else if (object instanceof Profile)
        {
          const geometry = object.geometry;
          const path = geometry.path;
          const points = path.getPoints(geometry.divisions);
          const vertices = points.map(p => new THREE.Vector3(p.x, p.y, 0));
          this.selectObject(object, vertices, boxProjected, selection);
        }
        else if (object instanceof Cord)
        {
          const geometry = object.geometry;
          this.selectObject(object, geometry.points, boxProjected, selection);
        }
        else if (object instanceof Text2D ||
                 object instanceof THREE.Sprite ||
                 object instanceof THREE.Camera ||
                 object instanceof THREE.Light ||
                 object instanceof THREE.Points)
        {
          this.selectObject(object, [zeroPoint], boxProjected, selection);
        }
        else if (object instanceof THREE.Mesh)
        {
          const geometry = object.geometry;
          const vertices = GeometryUtils.getBufferGeometryVertices(geometry);
          this.selectObject(object, vertices, boxProjected, selection);
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
  }

  selectObject(object, vertices, box, selection)
  {
    if (!vertices) return;

    const application = this.application;
    const camera = application.camera;
    const vertex = new THREE.Vector3();
    const cameraPoint = new THREE.Vector2();

    const length = vertices.length;
    if (length === 0) return;

    for (let i = 0; i < length; i++)
    {
      vertex.copy(vertices[i])
        .applyMatrix4(object.matrixWorld)
        .project(camera);
      cameraPoint.x = vertex.x;
      cameraPoint.y = vertex.y;

      if (!box.containsPoint(cameraPoint)) return;
    }
    selection.push(this.findActualSelectedObject(object));
  }
}

export { SelectByBoxTool };