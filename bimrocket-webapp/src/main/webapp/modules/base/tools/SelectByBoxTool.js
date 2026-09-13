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

    this.boxHandler = new BoxHandler(this);
    this.boxHandler.onBoxDrawn = (box, event) => this.onBoxDrawn(box, event);

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createToolPanel(this)
      .setDefaultHeight(120)
      .setDefaultMobileHeight(120)
      .setMinimumHeight(80);

    this.panel.onClose = () => this.application.useTool(null);

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
    this.boxHandler.enable();
    this.selectModeElem.setValue(this.application.selectionMode);
  }

  deactivate()
  {
    this.panel.visible = false;
    this.boxHandler.disable();
  }

  onBoxDrawn(box, event)
  {
    let boxProjected = new THREE.Box2();
    boxProjected.expandByPoint(this.toCamera(box.min));
    boxProjected.expandByPoint(this.toCamera(box.max));

    this.selectObjects(boxProjected, event);
  }

  toCamera(screenPoint)
  {
    const container = this.application.container;
    let pointcc = new THREE.Vector2();
    pointcc.x = (screenPoint.x / container.clientWidth) * 2 - 1;
    pointcc.y = -(screenPoint.y / container.clientHeight) * 2 + 1;
    return pointcc;
  }

  selectObjects(boxProjected, event)
  {
    const application = this.application;
    const baseObject = application.baseObject;
    const selection = [];

    const explore = object => {
      if (object.visible)
      {
        if (object instanceof Solid)
        {
          if (object.facesVisible)
          {
            const geometry = object.geometry;
            const vertices = geometry.vertices;
            this.selectObject(object, vertices, boxProjected, selection);
          }
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

    application.userSelectObjects(selection, event);
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