/*
 * BIMExplodeTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
import { Controls } from "../ui/Controls.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import * as THREE from "three";

class BIMExplodeTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "bim_explode";
    this.label = "bim|tool.bim_explode.label";
    this.className = "bim_explode";
    this.setOptions(options);
    application.addTool(this);

    this.buildingMap = new Map();

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 300;

    this.panel.onClose = () => this.application.useTool(null);

    this.helpElem = document.createElement("div");
    this.helpElem.style.padding = "8px";
    this.panel.bodyElem.appendChild(this.helpElem);

    I18N.set(this.helpElem, "textContent", "bim|tool.bim_explode.help");

    this.buildingSelect = Controls.addSelectField(this.panel.bodyElem,
      "explode_building", "bim|label.bim_explode_building");

    this.buildingSelect.addEventListener("change", () => this.restoreOffsets());
    this.buildingSelect.style.display = "block";
    this.buildingSelect.style.width = "80%";
    this.buildingSelect.style.margin = "auto";

    this.xOffsetRange = Controls.addRangeField(this.panel.bodyElem,
      "explode_x", "bim|label.bim_explode_xoffset", -100, 100, 0.5, 0);
    this.xOffsetRange.addEventListener("input",
      () => this.applyOffset(), false);

    this.yOffsetRange = Controls.addRangeField(this.panel.bodyElem,
      "explode_y", "bim|label.bim_explode_yoffset", -100, 100, 0.5, 0);
    this.yOffsetRange.addEventListener("input",
      () => this.applyOffset(), false);

    this.zOffsetRange = Controls.addRangeField(this.panel.bodyElem,
      "explode_z", "bim|label.bim_explode_zoffset", -20, 20, 0.1, 0);
    this.zOffsetRange.addEventListener("input",
      () => this.applyOffset(), false);

    const resetButton = Controls.addButton(this.panel.bodyElem,
      "reset_explode", "button.reset", () => this.reset());
  }

  activate()
  {
    const application = this.application;
    const container = application.container;
    this.panel.visible = true;
    this.updateBuildings();
  }

  deactivate()
  {
    const application = this.application;
    const container = application.container;
    this.panel.visible = false;
    this.buildingMap.clear();
  }

  updateBuildings()
  {
    const application = this.application;
    const baseObject = application.baseObject;
    const buildingOptions = [];

    let buildingCount = 0;

    baseObject.traverse(obj =>
    {
      if (obj.userData.IFC?.ifcClassName === "IfcBuilding")
      {
        const building = obj;
        const key = String(buildingCount++);

        this.buildingMap.set(key, building);
        buildingOptions.push([key, building.name]);
        this.initOffsets(building);
      }
    });
    Controls.setSelectOptions(this.buildingSelect, buildingOptions);

    const disabled = buildingCount === 0;
    this.xOffsetRange.disabled = disabled;
    this.yOffsetRange.disabled = disabled;
    this.zOffsetRange.disabled = disabled;

    if (disabled)
    {
      this.xOffsetRange.rangeValue = 0;
      this.yOffsetRange.rangeValue = 0;
      this.zOffsetRange.rangeValue = 0;
    }
    else
    {
      this.restoreOffsets();
    }
  }

  initOffsets(building)
  {
    if (!building._explodeOffsets)
    {
      building._explodeOffsets = { x: 0, y : 0, z : 0 };
    }
  }

  restoreOffsets()
  {
    const key = this.buildingSelect.value;
    let building = this.buildingMap.get(key);

    this.xOffsetRange.rangeValue = building._explodeOffsets.x;
    this.yOffsetRange.rangeValue = building._explodeOffsets.y;
    this.zOffsetRange.rangeValue = building._explodeOffsets.z;
  }


  applyOffset()
  {
    const application = this.application;
    const scene = application.scene;

    let key = this.buildingSelect.value;
    let building = this.buildingMap.get(key);

    if (!building || !ObjectUtils.isObjectDescendantOf(building, scene))
    {
      this.updateBuildings();
      return;
    }

    let xoffset = building._explodeOffsets.x = parseFloat(this.xOffsetRange.value);
    let yoffset = building._explodeOffsets.y = parseFloat(this.yOffsetRange.value);
    let zoffset = building._explodeOffsets.z = parseFloat(this.zOffsetRange.value);

    let haveOffset = xoffset !== 0 || yoffset !== 0 || zoffset !== 0;

    const scale = building.parent?.parent?.scale || new THREE.Vector3(1, 1, 1);
    const storeys = [... building.children];
    storeys.sort((a, b) => a.userData.IFC?.Elevation - b.userData.IFC?.Elevation);

    let level = 0;

    for (let storey of storeys)
    {
      let originalPosition = storey._originalPosition;
      if (haveOffset)
      {
        if (!originalPosition)
        {
          originalPosition = storey._originalPosition =
            new THREE.Vector3().copy(storey.position);
        }
      }
      else // no offset
      {
        if (originalPosition)
        {
          delete storey._originalPosition;
        }
      }

      if (originalPosition)
      {
        storey.position.x = originalPosition.x + level * xoffset / scale.x;
        storey.position.y = originalPosition.y + level * yoffset / scale.y;
        storey.position.z = originalPosition.z + level * zoffset / scale.z;
        storey.updateMatrix();
        level++;
      }
    }
    application.notifyObjectsChanged(storeys);
  }

  reset()
  {
    this.xOffsetRange.rangeValue = 0;
    this.yOffsetRange.rangeValue = 0;
    this.zOffsetRange.rangeValue = 0;
    this.applyOffset();
  }
}


export { BIMExplodeTool };
