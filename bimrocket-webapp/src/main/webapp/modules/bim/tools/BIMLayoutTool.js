/*
 * BIMLayoutTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { Tree } from "platform/ui/tree/Tree.js";
import { IFC } from "platform/io/ifc/IFC.js";
import { ObjectUtils } from "platform/utils/ObjectUtils.js";
import { Controls } from "platform/ui/Controls.js";
import { GestureHandler } from "platform/ui/GestureHandler.js";
import * as THREE from "three";

class BIMLayoutTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "bim_layout";
    this.label = "bim|tool.bim_layout.label";
    this.help = "bim|tool.bim_layout.help";
    this.className = "bim-layout";
    this.iconName = "bim|bim-layout";
    this.offsetFactor = 2;

    this.setOptions(options);
    application.addTool(this);

    this.immediate = true;

    this._onScene = this.onScene.bind(this);

    this.createPanel();
  }

  createPanel()
  {
    const application = this.application;

    this.panel = application.createToolPanel(this)
      .setDefaultHeight(300)
      .setDefaultMobileHeight(260)
      .setMinimumHeight(200)
      .setPriority(2);

    this.layoutPanelElem = document.createElement("div");
    this.layoutPanelElem.className = "bim-layout-panel";
    this.panel.bodyElem.appendChild(this.layoutPanelElem);
    this.panel.bodyElem.classList.add("p-1");

    this.showAllButton = Controls.addButton(this.layoutPanelElem,
      "show_all", "bim|button.show_all", () => this.showAll());

    this.linkModelsCheckbox = Controls.addCheckBoxField(this.layoutPanelElem,
      "link_models", "bim|label.link_models", false, "field-row");

    this.keepPointOfViewCheckbox = Controls.addCheckBoxField(this.layoutPanelElem,
      "keep_pov", "bim|label.keep_pov", false, "field-row");

    this.layoutTree = new Tree(this.layoutPanelElem);

    this.panel.onActivate = () =>
    {
      this.updateTree();
      application.addEventListener("scene", this._onScene);
    };

    this.panel.onDeactivate = () =>
    {
      application.removeEventListener("scene", this._onScene);
      return true;
    };
  }

  execute()
  {
    this.panel.visible = true;
  }

  updateTree()
  {
    const application = this.application;
    const container = application.container;

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
          let storeyLabel = storey.object.name;
          let elevation = storey.object.userData.IFC.Elevation;
          if (typeof elevation === "number")
          {
            storeyLabel +=  " (";
            // get units from project node
            let units = storey.object.parent?.parent?.parent?.userData.units;
            if (units)
            {
              elevation /= ObjectUtils.METER_CONVERSION_FACTORS[units] || 1;
              storeyLabel += application.formatMeasure(elevation, 1);
            }
            else
            {
              storeyLabel += application.formatMeasure(elevation, 1, "");
            }
            storeyLabel += ")";
          }
          const storeyTreeNode = buildingTreeNode.addNode(storeyLabel,
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

  onScene(event)
  {
    if (event.source === this) return;
    if (event.objects?.length === 1 && event.type !== "structureChanged")
    {
      let object = event.objects[0];
      if (object instanceof THREE.Camera) return;
      if (!ObjectUtils.isObjectDescendantOf(object, this.application.baseObject))
        return;
    }

    this.updateTree();
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
        else if (this.isCeilingElement(ifcData))
        {
          if (!obj.visible)
          {
            obj.visible = true;
            application.notifyObjectsChanged(obj, this);
          }
        }
      }
    });

    application.selection.set(application.baseObject);

    this.pointCamera(90, 0);
  }

  focusOnObject(event, object, view)
  {
    event.preventDefault();
    const application = this.application;

    if (!object ||
        !ObjectUtils.isObjectDescendantOf(object, application.baseObject))
       return;

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
        else if (this.isCeilingElement(ifcData))
        {
          if (currObj.visible)
          {
            currObj.visible = false;
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

    application.selection.set(object);

    if (this.keepPointOfViewCheckbox.checked)
    {
      this.pointCamera();
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
  }

  pointCamera(phiDeg, tethaDeg)
  {
    const application = this.application;
    let object = application.selection.object;
    if (object)
    {
      const container = application.container;
      const aspect = container.clientWidth / container.clientHeight;
      const camera = application.camera;

      if (phiDeg !== undefined && tethaDeg !== undefined)
      {
        camera.rotation.x = 0;
        camera.rotation.y = 0;
        camera.rotation.z = 0;

        let phi = THREE.MathUtils.degToRad(phiDeg);
        let theta = THREE.MathUtils.degToRad(tethaDeg);

        camera.rotateZ(theta);
        camera.rotateX(phi);

        camera.updateMatrix();
      }

      application.scene.updateMatrixWorld(true);
      ObjectUtils.zoomAll(camera, object, aspect,
        object !== application.baseObject, this.offsetFactor);
      application.notifyObjectsChanged(camera, this);
    }
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

  isCeilingElement(ifcData)
  {
    if (ifcData.ifcClassName === "IfcRoof") return true;

    if (ifcData.ifcClassName === "IfcSlab" &&
        (ifcData.PredefinedType === ".ROOF." ||
         ifcData.ObjectType === "Ceiling")) return true;

    if (ifcData.ifcClassName === "IfcCovering" &&
        ifcData.PredefinedType === ".CEILING.") return true;

    return false;
  }
}

export { BIMLayoutTool };
