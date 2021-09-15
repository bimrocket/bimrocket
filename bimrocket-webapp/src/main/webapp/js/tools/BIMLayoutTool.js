/*
 * BIMLayoutTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Tree } from "../ui/Tree.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { Controls } from "../ui/Controls.js";
import * as THREE from "../lib/three.module.js";

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

    this._onMouseUp = this.onMouseUp.bind(this);
    this._onMouseDown = this.onMouseDown.bind(this);
    this._onMouseMove = this.onMouseMove.bind(this);
    this._animate = this.animate.bind(this);

    this.rotateStart = new THREE.Vector2();
    this.rotateEnd = new THREE.Vector2();
    this.rotateVector = new THREE.Vector2();

    this.phi = 0;
    this.theta = 0;

    this.selectedObject = null;
    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");

    this.layoutPanelElem = document.createElement("div");
    this.layoutPanelElem.className = "bim_layout_panel";
    this.panel.bodyElem.appendChild(this.layoutPanelElem);
    this.panel.bodyElem.classList.add("padding");

    this.showAllButton = Controls.addButton(this.layoutPanelElem,
      "show_all", "bim|button.show_all", () => this.showAll());

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

    container.addEventListener('mousedown', this._onMouseDown, false);
    application.addEventListener('animation', this._animate);

    this.sites = [];
    let sites = this.sites;

    let site = null;
    let building = null;
    let storey = null;
    let space = null;

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
        this.focusOnObject(event, site.object, "IfcSite", "front"), "IfcSite");

      for (let b = 0; b < site.buildings.length; b++)
      {
        let building = site.buildings[b];

        const buildingTreeNode = siteTreeNode.addNode(building.object.name,
          event => this.focusOnObject(event, building.object, "IfcBuilding",
          "front"), "IfcBuilding");

        for (let st = 0; st < building.storeys.length; st++)
        {
          let storey = building.storeys[st];

          const storeyTreeNode = buildingTreeNode.addNode(storey.object.name,
            event => this.focusOnObject(event, storey.object,
            "IfcBuildingStorey", "top"), "IfcBuildingStorey");

          for (let sp = 0; sp < storey.spaces.length; sp++)
          {
            let space = storey.spaces[sp];

            const spaceTreeNode = storeyTreeNode.addNode(space.object.name,
              event => this.focusOnObject(event, space.object,
              "IfcSpace", "top"), "IfcSpace");
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
    container.removeEventListener('mousedown', this._onMouseDown, false);
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
      ObjectUtils.zoomAll(camera, this.selectedObject, aspect, true);
      let changeEvent = {type: "nodeChanged", objects: [camera], source : this};
      application.notifyEventListeners("scene", changeEvent);

      this.updateCamera = false;
    }
  }

  onMouseDown(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();

    const container = this.application.container;
    container.addEventListener('mousemove', this._onMouseMove, false);
    container.addEventListener('mouseup', this._onMouseUp, false);

    this.rotateStart = this.getMousePosition(event);
  }

  onMouseMove(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();

    let mousePosition = this.getMousePosition(event);

    this.rotateEnd.copy(mousePosition);
    this.rotateVector.subVectors(this.rotateEnd, this.rotateStart);
    this.rotateStart.copy(this.rotateEnd);

    this.theta -= 0.005 * this.rotateVector.x;
    this.phi -= 0.005 * this.rotateVector.y;
    if (this.phi < 0) this.phi = 0;
    else if (this.phi > Math.PI) this.phi = Math.PI;
    this.updateCamera = true;
  }

  onMouseUp(event)
  {
    const container = this.application.container;
    container.removeEventListener('mousemove', this._onMouseMove, false);
    container.removeEventListener('mouseup', this._onMouseUp, false);
  }

  showAll()
  {
    const application = this.application;
    application.baseObject.traverse(function(obj)
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
            const sceneEvent = {type: "nodeChanged", objects: [obj],
              source : this};
            application.notifyEventListeners("scene", sceneEvent);
          }
        }
      }
    });

    this.pointCamera(90, 0);
    this.selectedObject = application.baseObject;
    application.selection.set(application.baseObject);
  }

  focusOnObject(event, object, ifcClassName, view)
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

    // search object of ifcClassName class
    let parentObject = object;
    while (parentObject)
    {
      if (parentObject.userData.IFC &&
          parentObject.userData.IFC.ifcClassName === ifcClassName) break;
      else parentObject = parentObject.parent;
    }

    application.baseObject.traverse(function(obj)
    {
      let ifcData = obj.userData.IFC;
      if (ifcData)
      {
        let ifcClassName = ifcData.ifcClassName;
        if (ifcClassName === "IfcSite" || ifcClassName === "IfcBuilding" ||
            ifcClassName === "IfcBuildingStorey" || ifcClassName === "IfcSpace")
        {
          let oldVisibility = obj.visible;
          obj.visible = obj === object ||
            ObjectUtils.isObjectDescendantOf(obj, parentObject) ||
            ObjectUtils.isObjectDescendantOf(object, obj);

          if (oldVisibility !== obj.visible)
          {
            let sceneEvent = {type: "nodeChanged", objects: [obj],
              source : this};
            application.notifyEventListeners("scene", sceneEvent);
          }
        }
      }
    });

    let angle = 0;
    if (siteObject)
    {
      const euler = new THREE.Euler();
      euler.setFromRotationMatrix(siteObject.matrixWorld);
      angle = THREE.Math.radToDeg(euler.z);
    }

    if (view === 'top')
    {
      this.pointCamera(0, angle);
    }
    else if (view === 'front')
    {
      this.pointCamera(90, angle);
    }
    this.selectedObject = object;
    application.selection.set(object);
  }

  pointCamera(phiDeg, tethaDeg)
  {
    this.phi = THREE.Math.degToRad(phiDeg);
    this.theta = THREE.Math.degToRad(tethaDeg);
    this.updateCamera = true;
  }
}

export { BIMLayoutTool };
