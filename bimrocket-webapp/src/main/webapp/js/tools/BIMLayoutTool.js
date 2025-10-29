/*
 * BIMLayoutTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Tree } from "../ui/Tree.js";
import { IFC } from "../io/ifc/IFC.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { Controls } from "../ui/Controls.js";
import { GestureHandler } from "../ui/GestureHandler.js";
import * as THREE from "three";

class BIMLayoutTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "bim_layout";
    this.label = "bim|tool.bim_layout.label";
    this.help = "bim|tool.bim_layout.help";
    this.className = "bim_layout";
    this.setOptions(options);
    application.addTool(this);

    this._onWheel = this.onWheel.bind(this);
    this._animate = this.animate.bind(this);

    this.phi = 0;
    this.theta = 0;
    this.offsetFactors = {
      "IfcSite" : 1,
      "IfcBuilding" : 1,
      "IfcBuildingStorey": 1,
      "IfcSpace" : 1
    };

    this.selectedObject = null;
    this.createPanel();

    this.gestureHandler = new GestureHandler(this);
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");

    this.panel.onClose = () => this.application.useTool(null);

    this.layoutPanelElem = document.createElement("div");
    this.layoutPanelElem.className = "bim_layout_panel";
    this.panel.bodyElem.appendChild(this.layoutPanelElem);
    this.panel.bodyElem.classList.add("padding");

    this.showAllButton = Controls.addButton(this.layoutPanelElem,
      "show_all", "bim|button.show_all", () => this.showAll());

    this.linkModelsCheckbox = Controls.addCheckBoxField(this.layoutPanelElem,
      "link_models", "bim|label.link_models", false, "option_block");

    this.keepPointOfViewCheckbox = Controls.addCheckBoxField(this.layoutPanelElem,
      "keep_pov", "bim|label.keep_pov", false, "option_block");

    this.layoutTree = new Tree(this.layoutPanelElem);
  }

  activate()
  {
    this.panel.visible = true;

    if (this.selectedObject !== this.application.selection.object)
    {
      this.selectedObject = null;
    }

    const application = this.application;
    const container = application.container;

    this.gestureHandler.enable();
    container.addEventListener('wheel', this._onWheel, { passive : false });
    application.addEventListener('animation', this._animate);

    this.sites = [];
    let sites = this.sites;

    let site = null;
    let building = null;
    let storey = null;

    let getBIMClass = object =>
    {
      let bimClass = null;
      if (object.name.indexOf('.') !== 0)
      {
        let ifcData = object.userData["IFC"];
        if (ifcData)
        {
          bimClass = ifcData["ifcClassName"];
        }
      }
      return bimClass;
    };

    let exploreObject = object =>
    {
      let bimClass = getBIMClass(object);
      if (bimClass === 'IfcSite')
      {
        site = {object: object, buildings:[], rotation : 0};
        site.rotation = object.rotation.z;
        sites.push(site);
      }
      else if (bimClass === 'IfcBuilding')
      {
        building = {object: object, storeys: []};
        site.buildings.push(building);
      }
      else if (bimClass === 'IfcBuildingStorey')
      {
        storey = {object: object, spaces: []};
        building.storeys.push(storey);
      }
      else if (bimClass === 'IfcSpace')
      {
        storey.spaces.push({object: object});
      }
      let children = object.children;
      for (let i = 0; i < children.length; i++)
      {
        let child = children[i];
        exploreObject(child);
      }
    };

    exploreObject(this.application.baseObject);

    this.layoutTree.clear();
    const layoutTree = this.layoutTree;

    for (let s = 0; s < sites.length; s++)
    {
      site = sites[s];

      const siteTreeNode = layoutTree.addNode(site.object.name, event =>
        this.focusOnObject(event, site.object, "front"), "IfcSite");

      for (let b = 0; b < site.buildings.length; b++)
      {
        let building = site.buildings[b];

        const buildingTreeNode = siteTreeNode.addNode(building.object.name,
          event => this.focusOnObject(event, building.object, "front"),
          "IfcBuilding");

        // sort storeys
        building.storeys.sort((s1, s2) =>
        {
          let elevation1 = s1.object.userData.IFC.Elevation;
          let elevation2 = s2.object.userData.IFC.Elevation;

          if (elevation1 < elevation2)
            return 1;
          else if (elevation1 > elevation2)
            return -1;
          else return 0;
        });

        for (let st = 0; st < building.storeys.length; st++)
        {
          let storey = building.storeys[st];

          const storeyTreeNode = buildingTreeNode.addNode(storey.object.name,
            event => this.focusOnObject(event, storey.object, "top"),
            "IfcBuildingStorey");

          // sort spaces
          storey.spaces.sort((s1, s2) =>
          {
            let name1 = s1.object.name;
            let name2 = s2.object.name;

            if (name1 < name2)
              return -1;
            else if (name1 > name2)
              return 1;
            else return 0;
          });

          for (let sp = 0; sp < storey.spaces.length; sp++)
          {
            let space = storey.spaces[sp];

            const spaceTreeNode = storeyTreeNode.addNode(space.object.name,
              event => this.focusOnObject(event, space.object, "top"),
              "IfcSpace");
          }
        }
      }
      siteTreeNode.expand(2);
    }
  }

  deactivate()
  {
    this.panel.visible = false;

    const application = this.application;
    const container = application.container;

    this.gestureHandler.disable();
    container.removeEventListener('wheel', this._onWheel);
    application.removeEventListener('animation', this._animate);
  }

  animate(event)
  {
    if (this.updateCamera && this.selectedObject)
    {
      const application = this.application;
      const container = application.container;
      const aspect = container.clientWidth / container.clientHeight;
      const camera = application.camera;

      camera.rotation.x = 0;
      camera.rotation.y = 0;
      camera.rotation.z = 0;

      camera.rotateZ(this.theta);
      camera.rotateX(this.phi);

      camera.updateMatrix();

      application.scene.updateMatrixWorld(true);
      ObjectUtils.zoomAll(camera, this.selectedObject, aspect,
        this.selectedObject !== application.baseObject, this.getOffsetFactor());
      application.notifyObjectsChanged(camera, this);

      this.updateCamera = false;
    }
  }

  onDrag(position, direction, pointerCount, button, pointerType)
  {
    this.theta -= 0.005 * direction.x;
    this.phi -= 0.005 * direction.y;
    if (this.phi < 0) this.phi = 0;
    else if (this.phi > Math.PI) this.phi = Math.PI;
    this.updateCamera = true;
  }

  onZoom(position, delta)
  {
    delta *= 0.005;
    let factor = this.getOffsetFactor();
    this.setOffsetFactor(factor + delta);
    this.updateCamera = true;
  }

  onWheel(event)
  {
    const application = this.application;

    if (!application.isCanvasEvent(event)) return;

    event.preventDefault();

    let delta = 0;

    if (event.wheelDelta)
    { // WebKit / Opera / Explorer 9
      delta = -event.wheelDelta * 0.001;
    }
    else if (event.detail)
    { // Firefox
      delta = 0.05 * event.detail;
    }

    if (delta !== 0)
    {
      let factor = this.getOffsetFactor();
      this.setOffsetFactor(factor + delta);
      this.updateCamera = true;
    }
  }

  setOffsetFactor(factor)
  {
    let ifcClassName = this.selectedObject?.userData.IFC?.ifcClassName;
    if (ifcClassName)
    {
      this.offsetFactors[ifcClassName] = factor;
    }
  }

  getOffsetFactor()
  {
    let ifcClassName = this.selectedObject?.userData.IFC?.ifcClassName;
    return ifcClassName ? this.offsetFactors[ifcClassName] : 1;
  }

  showAll()
  {
    const application = this.application;
    application.baseObject.traverse(obj =>
    {
      let ifcData = obj.userData.IFC;
      if (ifcData)
      {
        let ifcClassName = ifcData.ifcClassName;
        if (ifcClassName === "IfcSite" || ifcClassName === "IfcBuilding" ||
            ifcClassName === "IfcBuildingStorey" || ifcClassName === "IfcSpace")
        {
          if (!obj.visible)
          {
            obj.visible = true;
            application.notifyObjectsChanged(obj, this);
          }

          if (ifcClassName === "IfcSite")
          {
            let siteRepr = IFC.getRepresentation(obj);
            if (siteRepr)
            {
              if (!siteRepr.visible)
              {
                siteRepr.visible = true;
                application.notifyObjectsChanged(siteRepr, this);
              }
            }
          }
        }
      }
    });

    this.pointCamera(90, 0);
    this.selectedObject = application.baseObject;
    application.selection.set(application.baseObject);
  }

  focusOnObject(event, object, view)
  {
    event.preventDefault();
    const application = this.application;

    // search site object
    let siteObject = object;
    while (siteObject)
    {
      if (siteObject.userData.IFC &&
          siteObject.userData.IFC.ifcClassName === "IfcSite") break;
      else siteObject = siteObject.parent;
    }

    let siteRepr = IFC.getRepresentation(siteObject);
    if (siteRepr)
    {
      siteRepr.visible = object === siteObject;
      application.notifyObjectsChanged(siteRepr, this);
    }

    let linkedObjects;

    if (this.linkModelsCheckbox.checked)
    {
      linkedObjects = [];

      application.baseObject.traverse(currObj =>
      {
        if (this.isObjectRelatedTo(currObj, object))
        {
          linkedObjects.push(currObj);
        }
      });
    }
    else linkedObjects = [object];

    application.baseObject.traverse(currObj =>
    {
      let ifcData = currObj.userData.IFC;
      if (ifcData)
      {
        let ifcClassName = ifcData.ifcClassName;
        if (ifcClassName === "IfcSite" || ifcClassName === "IfcBuilding" ||
            ifcClassName === "IfcBuildingStorey" || ifcClassName === "IfcSpace")
        {
          let oldVisibility = currObj.visible;
          currObj.visible = false;

          for (let linkedObject of linkedObjects)
          {
            if (currObj === linkedObject ||
              ObjectUtils.isObjectDescendantOf(currObj, linkedObject) ||
              ObjectUtils.isObjectDescendantOf(linkedObject, currObj))
            {
              currObj.visible = true;
              break;
            }
          }

          if (oldVisibility !== currObj.visible)
          {
            application.notifyObjectsChanged(currObj, this);
          }
        }
      }
    });

    let angle = 0;
    if (siteObject)
    {
      const euler = new THREE.Euler();
      euler.setFromRotationMatrix(siteObject.matrixWorld);
      angle = THREE.MathUtils.radToDeg(euler.z);
    }

    if (this.keepPointOfViewCheckbox.checked)
    {
      this.updateCamera = true;
    }
    else
    {
      if (view === 'top')
      {
        this.pointCamera(0, angle);
      }
      else if (view === 'front')
      {
        this.pointCamera(90, angle);
      }
    }
    this.selectedObject = object;
    application.selection.set(object);
  }

  pointCamera(phiDeg, tethaDeg)
  {
    this.phi = THREE.MathUtils.degToRad(phiDeg);
    this.theta = THREE.MathUtils.degToRad(tethaDeg);
    this.updateCamera = true;
  }

  isObjectRelatedTo(object1, object2)
  {
    if (object1.userData.IFC && object2.userData.IFC)
    {
      const IFC1 = object1.userData.IFC;
      const IFC2 = object2.userData.IFC;

      if (IFC1.Name === IFC2.Name) return true;

      if (IFC1.GlobalId !== undefined && IFC1.GlobalId === IFC2.GlobalId)
        return true;

      if (IFC1.Elevation !== undefined && IFC1.Elevation === IFC2.Elevation)
        return true;
    }
    return false;
  }
}

export { BIMLayoutTool };
