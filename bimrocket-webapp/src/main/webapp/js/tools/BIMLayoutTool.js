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

    let scope = this;
    this.showAllButton = document.createElement("button");
    this.showAllButton.innerHTML = "Show all";
    this.showAllButton.addEventListener("click", function() 
    {
      scope.showAll();
    }, false);
    this.layoutPanelElem.appendChild(this.showAllButton);

    this.layoutListElem = document.createElement("ul");
    this.layoutListElem.className = "bim_layout_list";
    this.layoutPanelElem.appendChild(this.layoutListElem);
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

    this.layoutListElem.innerHTML = "";

    for (let s = 0; s < sites.length; s++)
    {
      site = sites[s];

      let siteItemElem = document.createElement("li");
      siteItemElem.className = "IfcSite";
      this.layoutListElem.appendChild(siteItemElem);

      this.createSiteLabel(site.object, siteItemElem);

      let siteListElem = document.createElement("ul");
      siteItemElem.appendChild(siteListElem);

      for (var b = 0; b < site.buildings.length; b++)
      {
        let building = site.buildings[b];

        var buildingItemElem = document.createElement("li");
        buildingItemElem.className = "IfcBuilding";
        siteListElem.appendChild(buildingItemElem);

        this.createBuildingLabel(building.object, buildingItemElem);

        var buildingListElem = document.createElement("ul");
        buildingItemElem.appendChild(buildingListElem);

        for (let st = 0; st < building.storeys.length; st++)
        {
          let storey = building.storeys[st];

          let storeyItemElem = document.createElement("li");
          storeyItemElem.className = "IfcBuildingStorey";
          buildingListElem.appendChild(storeyItemElem);

          this.createStoreyLabel(storey.object, storeyItemElem);

          let storeyListElem = document.createElement("ul");
          storeyItemElem.appendChild(storeyListElem);

          for (let sp = 0; sp < storey.spaces.length; sp++)
          {
            let space = storey.spaces[sp];

            let spaceItemElem = document.createElement("li");
            spaceItemElem.className = "IfcSpace";
            storeyListElem.appendChild(spaceItemElem);

            this.createSpaceLabel(space.object, spaceItemElem);
          }
        }
      }
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
      let changeEvent = {type: "nodeChanged", object: camera, source : this};
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

  createSiteLabel(object, elem)
  {
    let siteSpanElem = document.createElement("span");
    siteSpanElem.innerHTML = object.name;
    elem.appendChild(siteSpanElem);
    const scope = this;
    if (object === this.selectedObject)
    {
      siteSpanElem.className = "selected";
    }
    siteSpanElem.addEventListener("click", function()
    {
      scope.selectTreeElem(siteSpanElem);
      scope.focusOnObject(object, "IfcSite", "front");
    }, false);
  }

  createBuildingLabel(object, elem)
  {
    let buildingSpanElem = document.createElement("span");
    buildingSpanElem.innerHTML = object.name;
    elem.appendChild(buildingSpanElem);
    const scope = this;
    if (object === this.selectedObject)
    {
      buildingSpanElem.className = "selected";
    }
    buildingSpanElem.addEventListener("click", function()
    {
      scope.selectTreeElem(buildingSpanElem);
      scope.focusOnObject(object, "IfcBuilding", "front");
    }, false);
  }

  createStoreyLabel(object, elem)
  {
    let storeySpanElem = document.createElement("span");
    storeySpanElem.innerHTML = object.name;
    elem.appendChild(storeySpanElem);
    const scope = this;
    if (object === this.selectedObject)
    {
      storeySpanElem.className = "selected";
    }
    storeySpanElem.addEventListener("click", function()
    {
      scope.selectTreeElem(storeySpanElem);
      scope.focusOnObject(object, "IfcBuildingStorey", "top");
    }, false);
  }

  createSpaceLabel(object, elem)
  {
    let spaceSpanElem = document.createElement("span");
    spaceSpanElem.innerHTML = object.name;
    elem.appendChild(spaceSpanElem);
    const scope = this;
    if (object === this.selectedObject)
    {
      spaceSpanElem.className = "selected";
    }
    spaceSpanElem.addEventListener("click", function()
    {
      scope.selectTreeElem(spaceSpanElem);
      scope.focusOnObject(object, "IfcBuildingStorey", "top");
    }, false);
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
            var sceneEvent = {type: "nodeChanged", object: obj, 
              source : this};
            application.notifyEventListeners("scene", sceneEvent);
          }
        }
      }
    });

    this.pointCamera(90, 0);
    this.selectTreeElem(null);
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
            let sceneEvent = {type: "nodeChanged", object: obj, 
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

  selectTreeElem(elem)
  {
    var selection = this.layoutListElem.getElementsByClassName("selected");  
    if (selection.length > 0)
    {
      selection[0].className = null;
    }
    if (elem)
    {
      elem.className = "selected";
    }
  }

  pointCamera(phiDeg, tethaDeg)
  {
    this.phi = THREE.Math.degToRad(phiDeg);
    this.theta = THREE.Math.degToRad(tethaDeg);    
    this.updateCamera = true;
  }
};
