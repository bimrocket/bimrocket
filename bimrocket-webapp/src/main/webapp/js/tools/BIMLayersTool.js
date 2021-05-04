/*
 * BIMLayersTool.js
 *
 * @autor: realor
 */

BIMROCKET.BIMLayersTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "bim_layers";
    this.label = "tool.bim_layers.label";
    this.help = "tool.bim_layers.help";
    this.className = "bim_layers";
    this.setOptions(options);

    this._onProductClick = this.onProductClick.bind(this);
    this._onFacesClick = this.onFacesClick.bind(this);
    this._onEdgesClick = this.onEdgesClick.bind(this);
    this._onAllFacesClick = this.onAllFacesClick.bind(this);
    this._onAllEdgesClick = this.onAllEdgesClick.bind(this);
    this.layers = {
      "IfcOpeningElement" : {
        name : "IfcOpeningElement",
        objects : [],
        edgesVisible : false,
        facesVisible : false
      },
      "IfcSpace" : {
        name : "IfcSpace",
        objects : [],
        edgesVisible : true,
        facesVisible : false
      }
    };
    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(
      "panel_" + this.name, this.label, "left");

    this.headerElem = document.createElement("div");
    this.headerElem.className = "bim_layers_header";

    let edgesCheckbox = document.createElement("input");
    edgesCheckbox.type = "checkbox";
    edgesCheckbox.id = "all-layer-edges";
    edgesCheckbox.checked = true;
    edgesCheckbox.title = "Edges";
    edgesCheckbox.addEventListener("click", this._onAllEdgesClick, false);
    this.headerElem.appendChild(edgesCheckbox);

    let facesCheckbox = document.createElement("input");
    facesCheckbox.type = "checkbox";
    facesCheckbox.id = "all-layer-faces";
    facesCheckbox.checked = true;
    facesCheckbox.title = "Faces";
    facesCheckbox.addEventListener("click", this._onAllFacesClick, false);
    this.headerElem.appendChild(facesCheckbox);

    let textElem = document.createElement("span");
    textElem.innerHTML = "IFC products:";
    this.headerElem.appendChild(textElem);

    this.layersElem = document.createElement("div");
    this.layersElem.className = "bim_layers_panel";

    this.panel.bodyElem.appendChild(this.headerElem);
    this.panel.bodyElem.appendChild(this.layersElem);
  }

  activate()
  {
    this.panel.visible = true;

    this.layersElem.innerHTML = "";

    for (let layerName in this.layers)
    {
      let layer = this.layers[layerName];
      layer.objects = [];
    }
    this.findLayers();

    let layerNames = Object.keys(this.layers);
    layerNames.sort();

    for (let i = 0; i < layerNames.length; i++)
    {
      let layer = this.layers[layerNames[i]];
      let objects = layer.objects;
      if (objects.length > 0)
      {
        let layerElem = document.createElement("div");
        layerElem.className = "layer";

        let edgesCheckbox = document.createElement("input");
        edgesCheckbox.type = "checkbox";
        edgesCheckbox.id = "layer-edges-" + layer.name;
        edgesCheckbox.checked = layer.edgesVisible;
        edgesCheckbox.className = "edges";
        edgesCheckbox.title = "Edges";
        edgesCheckbox.addEventListener("click", this._onEdgesClick, false);
        layerElem.appendChild(edgesCheckbox);

        let facesCheckbox = document.createElement("input");
        facesCheckbox.type = "checkbox";
        facesCheckbox.id = "layer-faces-" + layer.name;
        facesCheckbox.checked = layer.facesVisible;
        facesCheckbox.className = "faces";
        facesCheckbox.title = "Faces";
        facesCheckbox.addEventListener("click", this._onFacesClick, false);
        layerElem.appendChild(facesCheckbox);

        let linkElem = document.createElement("a");
        linkElem.id = "layer-" + layer.name;
        linkElem.href="#";
        let objects = layer.objects;
        linkElem.innerHTML = layer.name + " (" + objects.length + ")";
        linkElem.addEventListener("click", this._onProductClick, false);
        layerElem.appendChild(linkElem);
        
        this.layersElem.appendChild(layerElem);
      }
    }
    this.updateAllLayersVisibility();
  }

  deactivate()
  {
    this.panel.visible = false;
  }

  findLayers()
  {
    let layers = this.layers;

    this.application.baseObject.traverse(function(object)
    {
      if (object.userData.IFC && object.type === "Object3D")
      {
        let ifcClassName = object.userData.IFC.ifcClassName;
        let layer = layers[ifcClassName];
        if (layer)
        {
          layer.objects.push(object);
        }
        else
        {
          layer = {
            name : ifcClassName,
            objects : [object],
            edgesVisible : true,
            facesVisible : true
          };
          layers[ifcClassName] = layer;
        }
      }
    });
    return layers;
  }

  updateLayerVisibility(layer)
  {
    let objects = layer.objects;
    for (let i = 0; i < objects.length; i++)
    {
      let object = objects[i];
      object = object.getObjectByName(BIMROCKET.IFC.RepresentationName);
      if (object)
      {
        this.application.updateVisibility(object,
          layer.edgesVisible, layer.facesVisible, true);
      }
    }
  }

  updateAllLayersVisibility()
  {
    for (let layerName in this.layers)
    {
      let layer = this.layers[layerName];
      this.updateLayerVisibility(layer);
    }
  }
  
  onProductClick(event)
  {
    let sourceElem = event.target;
    let id = sourceElem.id;
    let layerName = id.substring(6);
    let application = this.application;
    let objects = [];
    application.scene.traverse(function(object)
    {
      let ifc = object._ifc;
      if (ifc)
      {
        if (ifc.constructor.ifcClassName === layerName)
        {
          objects.push(object);
        }
      }
    });
    application.selection.set(...objects);
  }

  onFacesClick(event)
  {
    let sourceElem = event.target;
    let id = sourceElem.id;
    let layerName = id.substring(12);
    let layer = this.layers[layerName];
    layer.facesVisible = sourceElem.checked;
    this.updateLayerVisibility(layer);
  }

  onEdgesClick(event)
  {
    let sourceElem = event.target;
    let id = sourceElem.id;
    let layerName = id.substring(12);
    let layer = this.layers[layerName];
    layer.edgesVisible = sourceElem.checked;
    this.updateLayerVisibility(layer);
  }

  onAllFacesClick(event)
  {
    let sourceElem = event.target;
    let elems = this.layersElem.getElementsByClassName("faces");
    for (let i = 0; i < elems.length; i++)
    {
      elems[i].checked = sourceElem.checked;
    }
    for (let layerName in this.layers)
    {
      let layer = this.layers[layerName];
      layer.facesVisible = sourceElem.checked;
    }
    this.updateAllLayersVisibility();
  }

  onAllEdgesClick(event)
  {
    let sourceElem = event.target;
    let elems = this.layersElem.getElementsByClassName("edges");
    for (let i = 0; i < elems.length; i++)
    {
      elems[i].checked = sourceElem.checked;
    }
    for (let layerName in this.layers)
    {
      let layer = this.layers[layerName];
      layer.edgesVisible = sourceElem.checked;
    }
    this.updateAllLayersVisibility();
  }
};

