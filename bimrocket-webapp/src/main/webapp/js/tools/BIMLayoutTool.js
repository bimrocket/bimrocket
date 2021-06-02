/*
 * BIMLayoutTool.js
 *
 * @autor: realor
 */

BIMROCKET.BIMLayoutTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "bim_layout";
    this.label = "tool.bim_layout.label";
    this.help = "tool.bim_layout.help";
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
    this.panel = this.application.createPanel(
      "panel_" + this.name, this.label, "left");

    this.layoutPanelElem = document.createElement("div");
    this.layoutPanelElem.className = "bim_layout_panel";
    this.panel.bodyElem.appendChild(this.layoutPanelElem);
    this.panel.bodyElem.classList.add("padding");

    let scope = this;
    this.showAllButton = document.createElement("button");
    this.showAllButton.innerHTML = "Show all";
    this.showAllButton.addEventListener("click", function() 
    {
      scope.showAll();
    }, false);
    this.layoutPanelElem.appendChild(this.showAllButton);

    this.layoutTree = new BIMROCKET.Tree(this.layoutPanelElem);
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
    const scope = this;
    container.addEventListener('mousedown', this._onMouseDown, false);
    application.addEventListener('animation', this._animate);

    this.sites = [];
    let sites = this.sites;

    let site = null;
    let building = null;
    let storey = null;
    let space = null;

    let getBIMClass = function(object)
    {
      var bimClass = null;
      if (object.name.indexOf('.') !== 0)
      {
        var ifcData = object.userData["IFC"];
        if (ifcData)
        {
          bimClass = ifcData["ifcClassName"];
        }
      }
      return bimClass;
    };

    let exploreObject = function(object)
    {
      var bimClass = getBIMClass(object);
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
      var children = object.children;
      for (var i = 0; i < children.length; i++)
      {
        var child = children[i];
        exploreObject(child);
      }
    };

    exploreObject(this.application.baseObject);

    this.layoutTree.clear();
    const layoutTree = this.layoutTree;

    for (let s = 0; s < sites.length; s++)
    {
      site = sites[s];

      const siteTreeNode = layoutTree.addNode(site.object.name, () => 
        this.focusOnObject(site.object, "IfcSite", "front"), "IfcSite");

      for (var b = 0; b < site.buildings.length; b++)
      {
        let building = site.buildings[b];

        const buildingTreeNode = siteTreeNode.addNode(building.object.name, 
        () => this.focusOnObject(building.object, "IfcBuilding", "front"), 
        "IfcBuilding");

        for (let st = 0; st < building.storeys.length; st++)
        {
          let storey = building.storeys[st];

          const storeyTreeNode = buildingTreeNode.addNode(storey.object.name, 
          () => this.focusOnObject(storey.object, "IfcBuildingStorey", "top"), 
          "IfcBuildingStorey");

          for (let sp = 0; sp < storey.spaces.length; sp++)
          {
            let space = storey.spaces[sp];

            const spaceTreeNode = storeyTreeNode.addNode(space.object.name, 
            () => this.focusOnObject(space.object, "IfcSpace", "top"), 
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
      BIMROCKET.ObjectUtils.zoomAll(camera, this.selectedObject, aspect);
      let changeEvent = {type: "nodeChanged", objects: [camera], source : this};
      application.notifyEventListeners("scene", changeEvent);

      this.updateCamera = false;
    }
  }

  onMouseDown(event)
  {
    event.preventDefault();

    const container = this.application.container;
    container.addEventListener('mousemove', this._onMouseMove, false);
    container.addEventListener('mouseup', this._onMouseUp, false);

    this.rotateStart = this.getMousePosition(event);
  }

  onMouseMove(event)
  {
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
    let application = this.application;
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
            var sceneEvent = {type: "nodeChanged", objects: [obj], 
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

  focusOnObject(object, ifcClassName, view)
  {
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
            BIMROCKET.ObjectUtils.isObjectDescendantOf(obj, parentObject) || 
            BIMROCKET.ObjectUtils.isObjectDescendantOf(object, obj);

          if (oldVisibility !== obj.visible)
          {
            let sceneEvent = {type: "nodeChanged", objects: [obj], 
              source : this};
            application.notifyEventListeners("scene", sceneEvent);
          }
        }
      }
    });

    let angle = THREE.Math.radToDeg(siteObject ? siteObject.rotation.z : 0);

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
};
