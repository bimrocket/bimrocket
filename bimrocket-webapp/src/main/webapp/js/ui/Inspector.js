/**
 * Inspector.js
 *
 * @author realor
 */

import { Panel } from "./Panel.js";
import { Tree } from "./Tree.js";
import { Dialog } from "./Dialog.js";
import { Action } from "./Action.js";
import { TabbedPane } from "./TabbedPane.js";
import { ContextMenu } from "./Menu.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { Application } from "./Application.js";
import { Solid } from "../core/Solid.js";
import { Text2D } from "../core/Text2D.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { Formula } from "../formula/Formula.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { FormulaDialog } from "./FormulaDialog.js";
import { PropertiesDialog } from "./PropertiesDialog.js";
import { PropertyDialog } from "./PropertyDialog.js";
import { BuilderDialog } from "./BuilderDialog.js";
import { ControllerDialog } from "./ControllerDialog.js";
import { Controls } from "./Controls.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "three";

class Inspector extends Panel
{
  static mainMaterialProperties = ["id", "uuid", "type", "name", "color",
    "specular", "emissive", "shininess", "opacity", "transparent", "side",
    "emissiveIntensity", "fog", "depthTest", "depthWrite", "flatShading",
    "polygonOffset", "polygonOffsetFactor", "polygonOffsetUnits",
    "sizeAttenuation", "size", "map"];

  constructor(application)
  {
    super(application);
    this.position = "right";

    this.object = null;
    this.objects = null;
    this.state = {};
    this.featuredProperties = {};

    this.renderers = {};
    this.editors = {};
    this.contextMenu = new ContextMenu(this.application);

    this.addRenderer(StringRenderer);
    this.addRenderer(NumberRenderer);
    this.addRenderer(BooleanRenderer);
    this.addRenderer(Vector2Renderer);
    this.addRenderer(Vector3Renderer);
    this.addRenderer(EulerRenderer);
    this.addRenderer(FormulaRenderer);
    this.addRenderer(ColorRenderer);
    this.addRenderer(ArrayRenderer);
    this.addRenderer(TextureRenderer);
    this.addRenderer(Object3DRenderer);

    this.addEditor(StringEditor);
    this.addEditor(NumberEditor);
    this.addEditor(BooleanEditor);
    this.addEditor(Vector2Editor);
    this.addEditor(Vector3Editor);
    this.addEditor(EulerEditor);
    this.addEditor(FormulaEditor);
    this.addEditor(ColorEditor);
    this.addEditor(ArrayEditor);
    this.addEditor(TextureEditor);

    this.addContextAction(EditFormulaAction);
    this.addContextAction(AddPropertyAction);
    this.addContextAction(RemovePropertyAction);
    this.addContextAction(StartControllerAction);
    this.addContextAction(StopControllerAction);
    this.addContextAction(RemoveControllerAction);
    this.addContextAction(AddControllerAction);
    this.addContextAction(AddFeaturedAction);
    this.addContextAction(RemoveFeaturedAction);
    this.addContextAction(ChangeMaterialAction);
    this.addContextAction(SetBuilderAction);
    this.addContextAction(EditPropertiesAction);
    this.addContextAction(RemoveAllFeaturedAction);

    this.objectCardElem = document.createElement("div");
    this.bodyElem.appendChild(this.objectCardElem);
    this.objectCardElem.className = "inspector_card";

    this.listCardElem = document.createElement("div");
    this.bodyElem.appendChild(this.listCardElem);
    this.listCardElem.className = "inspector_card list";

    this.toolBarElem = document.createElement("div");
    this.objectCardElem.appendChild(this.toolBarElem);
    this.toolBarElem.className = "inspector_toolbar";

    this.listButton = Controls.addButton(this.toolBarElem,
      "list", null, event =>
    {
      this.listCardElem.style.display = "";
      this.objectCardElem.style.display = "none";
    }, "list");
    I18N.set(this.listButton, "title", "button.list");
    I18N.set(this.listButton, "alt", "button.list");

    this.previousButton = Controls.addButton(this.toolBarElem,
      "previous", null, event =>
    {
      if (this.objectIndex > 0)
      {
        this.showProperties(this.objects[this.objectIndex - 1]);
        this.centerObject();
      }
    }, "previous");
    I18N.set(this.previousButton, "title", "button.previous");
    I18N.set(this.previousButton, "alt", "button.previous");

    this.indexElem = document.createElement("span");
    this.toolBarElem.appendChild(this.indexElem);

    this.nextButton = Controls.addButton(this.toolBarElem,
      "next", null, event =>
    {
      if (this.objectIndex < this.objects.length - 1)
      {
        this.showProperties(this.objects[this.objectIndex + 1]);
        this.centerObject();
      }
    }, "next");
    I18N.set(this.nextButton, "title", "button.next");
    I18N.set(this.nextButton, "alt", "button.next");

    this.selectButton = Controls.addButton(this.toolBarElem,
      "select", null, event =>
    {
      this.application.selection.set(this.object);
    }, "select");
    I18N.set(this.selectButton, "title", "button.select");
    I18N.set(this.selectButton, "alt", "button.select");

    this.propertiesElem = document.createElement("div");
    this.propertiesElem.className = "inspector_properties";
    this.objectCardElem.appendChild(this.propertiesElem);
    this.propertiesTabbedPane = new TabbedPane(this.propertiesElem);
    this.propertiesTabbedPane.addClassName("h_full");

    this.objectTabElem = this.propertiesTabbedPane.addTab("object", null,
      "label.inspector_object_tab", "object");
    this.geometryTabElem = this.propertiesTabbedPane.addTab("geometry", null,
      "label.inspector_geometry_tab", "geometry");
    this.materialTabElem = this.propertiesTabbedPane.addTab("material", null,
      "label.inspector_material_tab", "material");
    this.builderTabElem = this.propertiesTabbedPane.addTab("builder", null,
      "label.inspector_builder_tab", "builder");
    this.formulasTabElem = this.propertiesTabbedPane.addTab("formulas", null,
      "label.inspector_formulas_tab", "formulas");
    this.userDataTabElem = this.propertiesTabbedPane.addTab("userdata", null,
      "label.inspector_userdata_tab", "userdata");
    this.linksTabElem = this.propertiesTabbedPane.addTab("links", null,
      "label.inspector_links_tab", "links");
    this.controllersTabElem = this.propertiesTabbedPane.addTab("controllers", null,
      "label.inspector_controllers_tab", "controllers");
    this.featuredTabElem = this.propertiesTabbedPane.addTab("featured", null,
      "label.inspector_featured_tab", "featured");

    this.objectTabElem.addEventListener("contextmenu", event =>
    {
      event.preventDefault();
      this.showContextMenu(event, []);
    });

    this.geometryTabElem.addEventListener("contextmenu", event =>
    {
      event.preventDefault();
      this.showContextMenu(event, ["geometry"]);
    });

    this.materialTabElem.addEventListener("contextmenu", event =>
    {
      event.preventDefault();
      this.showContextMenu(event, ["material"]);
    });

    this.builderTabElem.addEventListener("contextmenu", event =>
    {
      event.preventDefault();
      this.showContextMenu(event, ["builder"]);
    });

    this.formulasTabElem.addEventListener("contextmenu", event =>
    {
      event.preventDefault();
      this.showContextMenu(event, ["formulas"]);
    });

    this.userDataTabElem.addEventListener("contextmenu", event =>
    {
      event.preventDefault();
      this.showContextMenu(event, ["userData"]);
    });

    this.linksTabElem.addEventListener("contextmenu",
      event => event.preventDefault());

    this.controllersTabElem.addEventListener("contextmenu", event =>
    {
      event.preventDefault();
      this.showContextMenu(event, ["controllers"]);
    });

    this.featuredTabElem.addEventListener("contextmenu", event =>
    {
      event => event.preventDefault();
      this.showContextMenu(event, ["featured"]);
    });

    this.objectIndex = -1;

    this.edition =
    {
      object : null,
      propertyName : null,
      renderer : null,
      editor : null,
      propElem : null
    };

    application.addEventListener("selection", event =>
    {
      this.stopEdition();

      this.showSelectedObjects(event.objects);

      if (event.objects.length === 1)
      {
        this.showProperties(event.objects[0]);
      }
    });

    application.addEventListener("scene", event =>
    {
      if (event.type === "nodeChanged" &&
          this.object &&
          event.objects.includes(this.object) &&
          event.source !== this)
      {
        if (event.properties instanceof Array)
        {
          for (let propertyName of event.properties)
          {
            this.updateProperty(this.object, propertyName);
          }
        }
        else
        {
          this.showProperties(this.object, true);
        }
      }
    });
    this.title = "tool.inspector.label";

    this.loadFeaturedProperties();
  }

  showCard(cardName)
  {
    this.listCardElem.style.display = cardName === "list" ? "" : "none";
    this.objectCardElem.style.display = cardName === "object" ? "" : "none";
  }

  loadFeaturedProperties()
  {
    const featuredString = this.application.setup.getItem("featuredProperties");
    if (featuredString)
    {
      this.featuredProperties = JSON.parse(featuredString);
      if (typeof this.featuredProperties !== "object")
      {
        this.featuredProperties = {};
      }
    }
  }

  saveFeaturedProperties()
  {
    const featuredString = JSON.stringify(this.featuredProperties);
    this.application.setup.setItem("featuredProperties", featuredString);
  }

  showSelectedObjects(objects)
  {
    this.showCard("list");

    this.listCardElem.innerHTML = "";

    this.objects = [...objects];
    this.objectIndex = objects.length >= 0 ? 0 : -1;

    const infoElem = document.createElement("div");
    infoElem.className = "inspector_info";
    I18N.set(infoElem, "textContent", "message.objects_selected", objects.length);
    this.application.i18n.update(infoElem);
    this.listCardElem.appendChild(infoElem);

    const selectionTree = new Tree(this.listCardElem);

    for (let object of objects)
    {
      let label = object.name || object.id;
      let className = ObjectUtils.getObjectClassNames(object);
      selectionTree.addNode(label, event =>
      {
        this.showProperties(object);
        this.centerObject();
      }, className);
    }
  }

  showProperties(object, forceUpdate = false)
  {
    if (this.edition.object) return; // edition in progress

    let objectChanged;
    if (this.object !== object)
    {
      this.object = object;
      objectChanged = true;
    }
    else
    {
      objectChanged = false;
    }
    this.objectIndex = this.objects.indexOf(object);

    this.updateToolBar();

    this.showCard("object");

    if (objectChanged || forceUpdate)
    {
      this.populateObjectTab();
      this.populateGeometryTab();
      this.populateMaterialTab();
      this.populateBuilderTab();
      this.populateFormulasTab();
      this.populateUserDataTab();
      this.populateLinksTab();
      this.populateControllersTab();
      this.populateFeaturedTab();

      this.application.i18n.updateTree(this.objectCardElem);
    }
  }

  populateObjectTab()
  {
    this.objectTabElem.innerHTML = "";

    const object = this.object;
    if (object)
    {
      let objListElem = document.createElement("ul");
      objListElem.className = "inspector";
      this.objectTabElem.appendChild(objListElem);

      const objectPath = [];

      this.createReadOnlyProperty(objListElem, object, objectPath, "id");
      for (let propertyName in object)
      {
        if (this.isSupportedProperty(propertyName))
        {
          if (this.isReadOnlyProperty(propertyName))
          {
            this.createReadOnlyProperty(objListElem, object, objectPath, propertyName);
          }
          else
          {
            this.createWriteableProperty(objListElem, object, objectPath, propertyName);
          }
        }
      }
      if (object instanceof Solid)
      {
        this.createWriteableProperty(objListElem, object, objectPath, "edgesVisible");
        this.createWriteableProperty(objListElem, object, objectPath, "facesVisible");
        this.createWriteableProperty(objListElem, object, objectPath, "castShadow");
        this.createWriteableProperty(objListElem, object, objectPath, "receiveShadow");
      }

      if (object instanceof Text2D)
      {
        this.createWriteableProperty(objListElem, object, objectPath, "text");
        this.createWriteableProperty(objListElem, object, objectPath, "fontSize");
        this.createWriteableProperty(objListElem, object, objectPath, "color");
        this.createWriteableProperty(objListElem, object, objectPath, "backgroundColor");
        this.createWriteableProperty(objListElem, object, objectPath, "maxWidth");
      }
    }
  }

  populateGeometryTab()
  {
    this.geometryTabElem.innerHTML = "";

    const object = this.object;
    const geometry = object?.geometry;
    if (geometry)
    {
      let geomListElem = document.createElement("ul");
      geomListElem.className = "inspector";
      this.geometryTabElem.appendChild(geomListElem);

      const geomPath = ["geometry"];

      this.createReadOnlyProperty(geomListElem, geometry, geomPath, "id");
      this.createReadOnlyProperty(geomListElem, geometry, geomPath, "uuid");
      this.createReadOnlyProperty(geomListElem, geometry, geomPath, "type");

      if (geometry instanceof SolidGeometry)
      {
        this.createReadOnlyProperty(geomListElem, geometry, geomPath, "vertices",
          geometry.vertices.length);
        this.createReadOnlyProperty(geomListElem, geometry, geomPath, "faces",
          geometry.faces.length);
        this.createReadOnlyProperty(geomListElem, geometry, geomPath, "isManifold");
        this.createReadOnlyProperty(geomListElem, geometry, geomPath, "smoothAngle");
      }
      else if (geometry instanceof THREE.BufferGeometry)
      {
        const attrPath = ["geometry", "attributes"];
        for (let name in geometry.attributes)
        {
          let attribute = geometry.attributes[name];
          this.createReadOnlyProperty(geomListElem, attribute, attrPath, name,
            attribute.array.length + " / " + attribute.itemSize);
        }
        if (geometry.getIndex())
        {
          let attribute = geometry.getIndex();
          this.createReadOnlyProperty(geomListElem, attribute, null,
            "index", attribute.array.length + " / " + attribute.itemSize);
        }
      }
    }
  }

  populateMaterialTab()
  {
    this.materialTabElem.innerHTML = "";

    const object = this.object;
    const material = object?.material;
    if (material)
    {
      const materialPath = ["material"];

      let materialListElem = document.createElement("ul");
      materialListElem.className = "inspector";
      this.materialTabElem.appendChild(materialListElem);

      for (let propertyName of Inspector.mainMaterialProperties)
      {
        if (propertyName in material)
        {
          if (this.isReadOnlyProperty(propertyName)
              || material === Solid.EdgeMaterial
              || material === Solid.FaceMaterial)
          {
            this.createReadOnlyProperty(materialListElem,
              material, materialPath, propertyName);
          }
          else
          {
            if (propertyName === "map")
            {
              this.createWriteableProperty(materialListElem,
                material, materialPath, propertyName,
                this.renderers.TextureRenderer, this.editors.TextureEditor);
            }
            else
            {
              this.createWriteableProperty(materialListElem,
                material, materialPath, propertyName);
            }
          }
        }
      }
    }
  }

  populateBuilderTab()
  {
    this.builderTabElem.innerHTML = "";

    const object = this.object;
    const builder = object?.builder;
    if (builder)
    {
      let builderListElem = document.createElement("ul");
      builderListElem.className = "inspector";
      this.builderTabElem.appendChild(builderListElem);

      const builderPath = ["builder"];

      this.createReadOnlyProperty(builderListElem, builder.constructor,
        builderPath, "type", builder.constructor.name);

      for (let propertyName in builder)
      {
        let propertyValue = builder[propertyName];
        if (this.isSupportedProperty(propertyName))
        {
          if (propertyValue !== null)
          {
            this.createWriteableProperty(builderListElem,
              builder, builderPath, propertyName);
          }
        }
      }
    }
  }

  populateUserDataTab()
  {
    this.userDataTabElem.innerHTML = "";

    const object = this.object;
    if (object)
    {
      let propListElem = document.createElement("ul");
      propListElem.className = "inspector";
      this.userDataTabElem.appendChild(propListElem);

      this.populateUserData(propListElem, object, []);
    }
  }

  populateFormulasTab()
  {
    this.formulasTabElem.innerHTML = "";

    const object = this.object;
    if (object)
    {
      const formulas = Formula.getAll(object);
      if (formulas)
      {
        let formulasListElem = document.createElement("ul");
        formulasListElem.className = "inspector";
        this.formulasTabElem.appendChild(formulasListElem);
        for (let path in formulas)
        {
          this.createWriteableProperty(formulasListElem, formulas, null, path);
        }
      }
    }
  }

  populateLinksTab()
  {
    this.linksTabElem.innerHTML = "";

    const object = this.object;
    const links = object?.links;
    if (links)
    {
      let linksListElem = document.createElement("ul");
      linksListElem.className = "inspector";
      this.linksTabElem.appendChild(linksListElem);

      for (let linkName in links)
      {
        let link = links[linkName];

        let linkPath = ["links", linkName];

        let linkPropsElem = this.createSection(linksListElem, linkPath);

        this.createProperty(linkPropsElem, links, linkPath, linkName,
          links[linkName], null, null, "object");

        let index = linkName.lastIndexOf("_");
        if (index !== -1)
        {
          // do not show properties for indexed links (link_0, link_1, ...)
          if (typeof parseInt(linkName.substring(index + 1)) === "number")
            continue;
        }
        this.populateUserData(linkPropsElem, link, linkPath);
      }
    }
  }

  populateControllersTab()
  {
    this.controllersTabElem.innerHTML = "";

    const object = this.object;
    const controllers = object?.controllers;
    if (controllers)
    {
      let controllersListElem = document.createElement("ul");
      controllersListElem.className = "inspector";
      this.controllersTabElem.appendChild(controllersListElem);

      for (let name in controllers)
      {
        const controller = controllers[name];
        if (this.state[name] === undefined)
        {
          this.state[name] = 'expanded';
        }
        const controllerPath = ["controllers", name];

        let controlListElem = this.createSection(controllersListElem, controllerPath,
          "controller", controller.isStarted() ? "started" : "stopped");
        this.createReadOnlyProperty(controlListElem, controller, controllerPath, "type",
          controller.constructor.name);
        this.createReadOnlyProperty(controlListElem, controller, controllerPath, "started",
          controller.isStarted());

        for (let propertyName in controller)
        {
          if (propertyName !== "name" && propertyName !== "object" &&
              !propertyName.startsWith("_"))
          {
            this.createWriteableProperty(controlListElem, controller,
              controllerPath, propertyName);
          }
        }
      }
    }
  }

  populateFeaturedTab()
  {
    this.featuredTabElem.innerHTML = "";

    const object = this.object;
    const featured = this.featuredProperties;

    let favListElem = document.createElement("ul");
    favListElem.className = "inspector";
    this.featuredTabElem.appendChild(favListElem);

    const populateGroup = (elem, object, group, path) =>
    {
      for (let name in group)
      {
        let value = object ? object[name] : undefined;

        if (group[name] === true)
        {
          if (value === undefined) value = "?";

          this.createReadOnlyProperty(elem, object,
            path, name, value);
        }
        else
        {
          let subPath = [...path, name];
          let subElem = this.createSection(elem, subPath);
          let subGroup = group[name];
          populateGroup(subElem, value, subGroup, subPath);
        }
      }
    };

    populateGroup(favListElem, object, featured, []);
  }

  populateUserData(listElem, object, objectPath)
  {
    const userData = object.userData;

    const userDataPath = [...objectPath, "userData"];

    for (let propertyName in userData)
    {
      let propertyValue = userData[propertyName];
      if (propertyValue !== null && typeof propertyValue === "object"
          && !(propertyValue instanceof Array))
      {
        let dictName = propertyName;
        let dictionary = propertyValue;
        if (this.state[dictName] === undefined)
        {
          this.state[dictName] = "expanded";
        }

        const dictPath = [...userDataPath, dictName];

        let dictListElem = this.createSection(listElem, dictPath);

        for (let dictPropertyName in dictionary)
        {
          this.createWriteableProperty(dictListElem, dictionary,
            dictPath, dictPropertyName);
        }
      }
      else
      {
        this.createWriteableProperty(listElem, userData,
          userDataPath, propertyName);
      }
    }
  }

  showContextMenu(event, objectPath, propertyName = null)
  {
    this._objectPath = objectPath;
    this._propertyName = propertyName;

    const contextMenu = this.contextMenu;

    if (this.edition.object === null)
    {
      contextMenu.show(event);
    }
  }

  updateToolBar()
  {
    this.indexElem.textContent =
      (this.objectIndex + 1) + " / " + this.objects.length;

    const objectCount = this.objects.length;
    if (objectCount < 2)
    {
      this.toolBarElem.style.display = "none";
    }
    else
    {
      this.toolBarElem.style.display = "";
      this.previousButton.disabled = this.objectIndex <= 0;
      this.nextButton.disabled = this.objectIndex >= objectCount - 1;
    }
  }

  centerObject()
  {
    const application = this.application;
    const object = this.object;
    if (object)
    {
      const container = application.container;
      const aspect = container.clientWidth / container.clientHeight;
      const camera = application.camera;

      ObjectUtils.zoomAll(camera, [object], aspect, true);

      application.notifyObjectsChanged(camera, this);
    }
  }

  getFormulaPath(objectPath, propertyName)
  {
    if (!objectPath || !propertyName) return null;

    const fullPath = [...objectPath, propertyName];
    let path = "";
    for (let name of fullPath)
    {
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name))
      {
        if (path.length > 0) path += ".";
        path += name;
      }
      else
      {
        name = name.replaceAll('"', '\\"');
        path += '["' + name + '"]';
      }
    }
    return path;
  }

  isSimpleValue(value)
  {
    const type = typeof value;
    return (type === "string"
        || type === "number"
        || type === "boolean"
        || value instanceof THREE.Vector3
        || value instanceof THREE.Euler
        || value instanceof THREE.Color);
  }

  createSection(parentElem, objectPath, ...classNames)
  {
    const sectionName = objectPath[objectPath.length - 1];

    let labelListener = event =>
    {
      let labelElem = event.target;
      if (labelElem.nodeName.toUpperCase() === "SPAN")
      {
        labelElem = labelElem.parentNode;
      }

      labelElem.className = (labelElem.className === "expand") ?
        "collapse" : "expand";
      let listElem = labelElem.parentNode.querySelector("ul");
      listElem.className = (listElem.className === "expanded") ?
        "collapsed" : "expanded";
      this.state[sectionName] = listElem.className;
    };

    let sectionElem = document.createElement("li");
    sectionElem.className = "section";
    parentElem.appendChild(sectionElem);
    if (classNames) sectionElem.classList.add(...classNames);

    let labelElem = document.createElement("div");
    labelElem.tabIndex = 0;

    let nameElem = document.createElement("span");
    nameElem.textContent = sectionName;
    labelElem.appendChild(nameElem);

    sectionElem.appendChild(labelElem);
    labelElem.className = this.state[sectionName] === "collapsed" ?
      "expand" : "collapse";
    labelElem.addEventListener("click", labelListener);

    sectionElem.addEventListener("contextmenu", event => {
      event.preventDefault();
      event.cancelBubble = true;

      this.showContextMenu(event, objectPath);
    });

    let listElem = document.createElement("ul");
    listElem.className = this.state[sectionName] || "expanded";
    sectionElem.appendChild(listElem);

    return listElem;
  }

  createReadOnlyProperty(parentElem, object, objectPath, propertyName,
    propertyValue = object[propertyName])
  {
    this.createProperty(parentElem, object, objectPath, propertyName, propertyValue);
  }

  createWriteableProperty(parentElem, object, objectPath, propertyName,
    renderer, editor)
  {
    let propertyValue = object[propertyName];

    editor = editor || this.getEditor(propertyValue);

    this.createProperty(parentElem, object, objectPath, propertyName, propertyValue,
      renderer, editor);
  };

  createProperty(parentElem, object, objectPath, propertyName, propertyValue,
    renderer = null, editor = null, propertyLabel = propertyName)
  {
    renderer = renderer || this.getRenderer(propertyValue);
    if (renderer)
    {
      let itemElem = document.createElement('li');
      if (object instanceof THREE.Object3D)
      {
        itemElem.id = "inspector_" + propertyName;
      }
      itemElem.className = "property " + renderer.getClassName(propertyValue);
      parentElem.appendChild(itemElem);

      let propElem = document.createElement("div");
      itemElem.appendChild(propElem);

      let labelElem = document.createElement("span");
      labelElem.textContent = propertyLabel + ':';
      labelElem.className = "label";
      labelElem.tabIndex = 0;
      propElem.appendChild(labelElem);

      this.createValueElem(propElem, object, propertyName, propertyValue,
        renderer, editor);

      if (editor)
      {
        const editProperty = (event) =>
        {
          if (this.edition.object === null) // no editing
          {
            event.preventDefault();

            const formulaPath = this.getFormulaPath(objectPath, propertyName);
            const formula = Formula.get(this.object, formulaPath);
            if (formula)
            {
              const dialog = new FormulaDialog(this.application, this.object, formula);
              dialog.show();
            }
            else
            {
              this.startEdition(propElem, object, propertyName, renderer, editor);
            }
          }
        };

        propElem.addEventListener("click", editProperty, false);
        labelElem.addEventListener("keydown", event =>
        {
          if (event.keyCode === 13)
          {
            editProperty(event);
          }
        }, false);
        itemElem.className += " editable";
      }

      const contextListener = event =>
      {
        event.preventDefault();
        event.cancelBubble = true;
        if (objectPath instanceof Array)
        {
          this.showContextMenu(event, objectPath, propertyName);
        }
      };

      propElem.addEventListener("contextmenu", contextListener);
    }
  }

  createValueElem(propElem, object, propertyName, propertyValue,
    renderer, editor)
  {
    let valueElem = renderer.render(propertyValue, !Boolean(editor));
    if (valueElem)
    {
      propElem.appendChild(valueElem);
    }
  }

  startEdition(propElem, object, propertyName, renderer, editor)
  {
    if (this.edition.object !== null)
    {
      this.stopEdition();
    }

    let propertyValue = object[propertyName];

    this.edition.object = object;
    this.edition.propertyName = propertyName;
    this.edition.renderer = renderer;
    this.edition.editor = editor;
    this.edition.propElem = propElem;

    let editorElem = editor.edit(object, propertyName, propertyValue);
    if (editorElem)
    {
      this.application.i18n.updateTree(editorElem);
      propElem.removeChild(propElem.lastChild);
      propElem.appendChild(editorElem);
      if (editorElem.focus) editorElem.focus();
    }
  }

  endEdition()
  {
    this.stopEdition();
    this.populateFeaturedTab();
    this.application.notifyObjectsChanged(this.object, this);
  }

  stopEdition()
  {
    let propElem = this.edition.propElem;
    if (propElem === null || this.edition.object === null) return;

    propElem.removeChild(propElem.lastChild);

    let propertyValue = this.edition.object[this.edition.propertyName];

    this.createValueElem(propElem, this.edition.object,
      this.edition.propertyName, propertyValue,
      this.edition.renderer, this.edition.editor);

    propElem.firstChild.focus();

    this.clearEdition();
  }

  clearEdition()
  {
    this.edition.object = null;
    this.edition.propertyName = null;
    this.edition.renderer = null;
    this.edition.editor = null;
    this.edition.propElem = null;
  }

  updateProperty(object, propertyName, renderer)
  {
    let propElem = document.getElementById("inspector_" + propertyName)?.firstChild;
    if (propElem)
    {
      propElem.removeChild(propElem.lastChild);

      let propertyValue = object[propertyName];

      renderer = renderer || this.getRenderer(propertyValue);

      this.createValueElem(propElem, object, propertyName, propertyValue,
        renderer);
    }
  }

  isSupportedProperty(propertyName)
  {
    if (propertyName[0] === '_') return false;
    if (propertyName === 'material') return false;
    return true;
  }

  isReadOnlyProperty(propertyName)
  {
    if (propertyName === 'id') return true;
    if (propertyName === 'uuid') return true;
    if (propertyName === 'type') return true;
    if (propertyName === 'matrixWorldNeedsUpdate') return true;
    if (propertyName === 'needsRebuild') return true;
    if (propertyName === 'needsMarking') return true;
    if (propertyName.indexOf("is") === 0) return true;

    return false;
  }

  addRenderer(rendererClass)
  {
    this.renderers[rendererClass.name] = new rendererClass(this);
  }

  addEditor(editorClass)
  {
    this.editors[editorClass.name] = new editorClass(this);
  }

  addContextAction(contextActionClass)
  {
    this.contextMenu.addMenuItem(new contextActionClass(this));
  }

  getRenderer(value)
  {
    for (let rendererName in this.renderers)
    {
      let renderer = this.renderers[rendererName];
      if (renderer.isSupported(value))
      {
        return renderer;
      }
    }
    return null;
  }

  getEditor(value)
  {
    for (let editorName in this.editors)
    {
      let editor = this.editors[editorName];
      if (editor.isSupported(value))
      {
        return editor;
      }
    }
    return null;
  }
};

/* PropertyRenderers */

class PropertyRenderer
{
  constructor(inspector)
  {
    this.inspector = inspector;
  }

  isSupported(value, type)
  {
    return false;
  }

  getClassName(value)
  {
    return "";
  }

  render(value, disabled) // returns elem
  {
    return null;
  }
}

class StringRenderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return typeof value === "string";
  }

  getClassName(value)
  {
    return "string";
  }

  render(text, disabled)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    if (disabled) valueElem.classList.add("disabled");
    valueElem.textContent = text;
    return valueElem;
  }
}

class NumberRenderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return typeof value === "number";
  }

  getClassName(value)
  {
    return "number";
  }

  render(number, disabled)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    if (disabled) valueElem.classList.add("disabled");
    valueElem.textContent = Math.round(number * 1000) / 1000;
    return valueElem;
  }
}

class BooleanRenderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return typeof value === "boolean";
  }

  getClassName(value)
  {
    return "boolean";
  }

  render(value, disabled)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    let checkboxElem = document.createElement("input");
    checkboxElem.type = "checkbox";
    checkboxElem.name = "bv";
    checkboxElem.checked = value;
    checkboxElem.tabIndex = -1;
    if (disabled) checkboxElem.disabled = true;
    valueElem.appendChild(checkboxElem);
    return valueElem;
  }
}

class Vector2Renderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof THREE.Vector2;
  }

  getClassName(value)
  {
    return "vector";
  }

  render(vector, disabled)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    if (disabled) valueElem.classList.add("disabled");

    let round = function(value)
    {
      var precision = 1000;
      return Math.round(precision * value) / precision;
    };
    let out = '(' + round(vector.x) + ', ' +
      round(vector.y) + ')';
    valueElem.textContent = out;
    return valueElem;
  }
}

class Vector3Renderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof THREE.Vector3;
  }

  getClassName(value)
  {
    return "vector";
  }

  render(vector, disabled)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    if (disabled) valueElem.classList.add("disabled");

    let round = function(value)
    {
      var precision = 1000;
      return Math.round(precision * value) / precision;
    };
    let out = '(' + round(vector.x) + ', ' +
      round(vector.y) + ', ' +
      round(vector.z) + ')';
    valueElem.textContent = out;
    return valueElem;
  }
}

class EulerRenderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof THREE.Euler;
  }

  getClassName(value)
  {
    return "euler";
  }

  render(euler, disabled)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    if (disabled) valueElem.classList.add("disabled");

    let angle = function(value)
    {
      var precision = 1000;
      return Math.round(precision *
        THREE.MathUtils.radToDeg(value)) / precision;
    };
    let out = '(' + angle(euler.x) + 'º, ' +
      angle(euler.y) + 'º, ' +
      angle(euler.z) + 'º)';
    valueElem.textContent = out;
    return valueElem;
  }
}

class FormulaRenderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof Formula;
  }

  getClassName(value)
  {
    return "formula";
  }

  render(formula, disabled)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    if (disabled) valueElem.classList.add("disabled");

    valueElem.textContent = formula.expression;
    return valueElem;
  }
};

class ColorRenderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof THREE.Color;
  }

  getClassName(value)
  {
    return "color";
  }

  render(color, disabled)
  {
    const rgb = "rgb(" + Math.round(255 * color.r) +
      ", " + Math.round(255 * color.g) + ", " + Math.round(255 * color.b) + ")";

    let valueElem = document.createElement("span");
    valueElem.className = "value";
    if (disabled) valueElem.classList.add("disabled");

    let codeElem = document.createElement("span");
    codeElem.textContent = rgb;
    valueElem.appendChild(codeElem);

    let colorElem = document.createElement("span");
    colorElem.className = "color";
    colorElem.style.backgroundColor = rgb;
    colorElem.alt = rgb;
    colorElem.title = rgb;
    valueElem.appendChild(colorElem);

    return valueElem;
  }
}

class ArrayRenderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return ObjectUtils.isBasicArray(value) && value.length > 0;
  }

  getClassName(value)
  {
    return "array";
  }

  render(array, disabled)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    valueElem.textContent = ArrayRenderer.arrayToString(array, 4);
    return valueElem;
  }

  static arrayToString(array, maxElements = array.length)
  {
    let outArray = [];
    for (let i = 0; i < array.length && i < maxElements; i++)
    {
      let value = array[i];
      if (typeof value === "string")
      {
        value = '"' + value.replace(/"/g, '\\"') + '"';
      }
      outArray.push(value);
    }
    if (array.length > maxElements)
    {
      outArray.push("...");
    }
    return "[ " + outArray.join(", ") + " ]";
  }
}

class Object3DRenderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof THREE.Object3D;
  }

  getClassName(value)
  {
    return "object3D";
  }

  render(object, disabled)
  {
    let valueElem = document.createElement("a");
    valueElem.href = "#";
    valueElem.className = "value";
    valueElem.textContent = object.name || "object-" + object.id;
    valueElem.addEventListener("click", event =>
    {
      event.preventDefault();
      const inspector = this.inspector;
      const application = inspector.application;
      const previousObject = inspector.object;

      application.userSelectObjects([object], event);

      if (inspector.objects.length > 1)
      {
        if (inspector.objects.includes(previousObject))
        {
          // keep previous object properties visible
          inspector.showProperties(previousObject);
        }
      }
    });
    return valueElem;
  }
}

class TextureRenderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof THREE.Texture;
  }

  getClassName(value)
  {
    return "texture";
  }

  render(texture, disabled)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    if (texture)
    {
      if (texture.name)
      {
        valueElem.textContent = texture.name;
      }
      else if (texture.image)
      {
        valueElem.textContent = texture.image.src;
      }
      else
      {
        valueElem.textContent = "";
      }
    }
    return valueElem;
  }
}

/* PropertyEditors */

class PropertyEditor
{
  constructor(inspector)
  {
    this.inspector = inspector;
  }

  isSupported(value)
  {
    return false;
  }

  edit(object, propertyName, value) // returns the editor element
  {
    return null;
  }
}

class StringEditor extends PropertyEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return typeof value === "string";
  }

  edit(object, propertyName, text)
  {
    let valueElem = document.createElement("input");
    valueElem.className = "value";
    valueElem.value = text;
    valueElem.setAttribute("spellcheck", "false");
    valueElem.addEventListener("keydown", event =>
    {
      if (event.keyCode === 13)
      {
        object[propertyName] = valueElem.value;
        this.inspector.endEdition();
      }
      else if (event.keyCode === 27)
      {
        this.inspector.stopEdition();
      }
    }, false);
    return valueElem;
  }
}

class NumberEditor extends PropertyEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return typeof value === "number";
  }

  edit(object, propertyName, number)
  {
    let valueElem = document.createElement("input");
    valueElem.className = "value";
    valueElem.value = "" + number;
    valueElem.type = "number";
    valueElem.addEventListener("keydown", event =>
    {
      if (event.keyCode === 13)
      {
        number = parseFloat(valueElem.value);
        if (!isNaN(number))
        {
          object[propertyName] = number;
          this.inspector.endEdition();
        }
      }
      else if (event.keyCode === 27)
      {
        this.inspector.stopEdition();
      }
    }, false);
    return valueElem;
  }
}

class BooleanEditor extends PropertyEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return typeof value === "boolean";
  }

  edit(object, propertyName, value)
  {
    let checked = value;
    object[propertyName] = !checked;
    this.inspector.endEdition();
    return null;
  }
}

class DimensionEditor extends PropertyEditor
{
  constructor(inspector)
  {
    super(inspector);
    this.dimensions = ["x", "y", "z"];
  }

  formatValue(value)
  {
    return value;
  }

  createInstance(values)
  {
    return {"x": values[0], "y": values[1], "z": values[2]};
  }

  edit(object, propertyName, vector)
  {
    const dimId = "dim_edit_";

    const parseDimension = dim =>
    {
      let valueElem = document.getElementById(dimId + dim);
      let value = valueElem.value;
      let num = parseFloat(value);
      return isNaN(num) ? vector[dim] : num;
    };

    const endEdition = () =>
    {
      let values = [];
      for (let dim of this.dimensions)
      {
        values.push(parseDimension(dim));
      }
      object[propertyName].copy(this.createInstance(values));
      if (object instanceof THREE.Object3D)
      {
        object.updateMatrix();
      }
      this.inspector.endEdition();
    };

    const keyListener = event =>
    {
      if (event.keyCode === 13)
      {
        endEdition();
      }
      else if (event.keyCode === 27)
      {
        this.inspector.stopEdition();
      }
    };

    const createDimensionEditor = (vector, dim) =>
    {
      let itemElem = document.createElement("li");

      let labelElem = document.createElement("label");
      labelElem.textContent = dim + ":";
      labelElem.htmlFor = dimId + dim;

      let valueElem = document.createElement("input");
      valueElem.id = dimId + dim;
      valueElem.type = "number";
      valueElem.className = "value";
      valueElem.value = this.formatValue(vector[dim]);

      valueElem.addEventListener("keydown", keyListener, false);

      itemElem.appendChild(labelElem);
      itemElem.appendChild(valueElem);

      return itemElem;
    };

    let listElem = document.createElement("ul");
    listElem.className = "list_3";
    for (let dim of this.dimensions)
    {
      listElem.appendChild(createDimensionEditor(vector, dim));
    }
    let firstDim = this.dimensions[0];
    listElem.focus = () => document.getElementById(dimId + firstDim).focus();

    return listElem;
  }
}

class Vector2Editor extends DimensionEditor
{
  constructor(inspector)
  {
    super(inspector);
    this.dimensions = ["x", "y"];
  }

  isSupported(value)
  {
    return value instanceof THREE.Vector2;
  }

  createInstance(values)
  {
    return new THREE.Vector2(values[0], values[1]);
  }
}

class Vector3Editor extends DimensionEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof THREE.Vector3;
  }

  createInstance(values)
  {
    return new THREE.Vector3(values[0], values[1], values[2]);
  }
}

class EulerEditor extends DimensionEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof THREE.Euler;
  }

  formatValue(value)
  {
    const precision = 10000000;
    return Math.round(precision * THREE.MathUtils.radToDeg(value)) / precision;
  }

  createInstance(values)
  {
    let xrad = THREE.MathUtils.degToRad(values[0]);
    let yrad = THREE.MathUtils.degToRad(values[1]);
    let zrad = THREE.MathUtils.degToRad(values[2]);

    return new THREE.Euler(xrad, yrad, zrad, "XYZ");
  }
}

class FormulaEditor extends PropertyEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof Formula;
  }

  edit(object, propertyName, formula)
  {
    const inspector = this.inspector;
    const application = inspector.application;

    const dialog = new FormulaDialog(application, inspector.object, formula);
    dialog.show();

    this.inspector.clearEdition();

    return null;
  }
}

class ColorEditor extends PropertyEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof THREE.Color;
  }

  edit(object, propertyName, color)
  {
    const groupElem = document.createElement("span");
    groupElem.className = "value";

    const rgb = "rgb(" + Math.round(255 * color.r) +
      ", " + Math.round(255 * color.g) + ", " + Math.round(255 * color.b) + ")";

    let codeElem = document.createElement("span");
    codeElem.textContent = rgb;
    codeElem.style.color = "#6060c0";
    codeElem.addEventListener("click",
      () => { colorElem.focus(); colorElem.click(); });
    groupElem.appendChild(codeElem);

    let hexString = "#" + color.getHexString();
    const sampleElem = document.createElement("label");
    sampleElem.className = "color";
    sampleElem.style.backgroundColor = hexString;
    sampleElem.alt = rgb;
    sampleElem.title = rgb;
    sampleElem.style.borderColor = "#6060c0";
    groupElem.appendChild(sampleElem);

    const colorElem = document.createElement("input");
    colorElem.className = "value";
    colorElem.type = "color";
    colorElem.value = "#" + color.getHexString();
    colorElem.style.visibility = "hidden";
    colorElem.style.width = "0";
    colorElem.style.height = "0";
    sampleElem.appendChild(colorElem);

    colorElem.addEventListener("change", () =>
    {
      object[propertyName].set(colorElem.value);
      document.body.removeEventListener("keydown", keyDownListener);
      document.body.removeEventListener("pointerdown", pointerDownListener);
      this.inspector.endEdition();
    });

    const cancel = () =>
    {
      if (colorElem.value.toLowerCase() !== "#" + color.getHexString())
        return; // ignore: it is a change

      document.body.removeEventListener("keydown", keyDownListener);
      document.body.removeEventListener("pointerdown", pointerDownListener);
      this.inspector.stopEdition();
    };

    const keyDownListener = event =>
    {
      if (event.keyCode === 27) cancel();
    };

    const pointerDownListener = event =>
    {
      if (event.target.parentNode !== groupElem) cancel();
    };

    document.body.addEventListener("keydown", keyDownListener);
    document.body.addEventListener("pointerdown", pointerDownListener);

    groupElem.focus = () => { colorElem.focus(); colorElem.click(); };

    return groupElem;
  }
}

class ArrayEditor extends PropertyEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return ObjectUtils.isBasicArray(value) && value.length > 0;
  }

  edit(object, propertyName, array)
  {
    let valueElem = document.createElement("input");
    valueElem.className = "value";
    valueElem.value = ArrayRenderer.arrayToString(array);
    valueElem.setAttribute("spellcheck", "false");
    valueElem.addEventListener("keydown", event =>
    {
      if (event.keyCode === 13)
      {
        try
        {
          let array = JSON.parse(valueElem.value);
          if (ObjectUtils.isBasicArray(array) && array.length > 0)
          {
            object[propertyName] = array;
            this.inspector.endEdition();
          }
        }
        catch (ex)
        {
        }
      }
      else if (event.keyCode === 27)
      {
        this.inspector.stopEdition();
      }
    }, false);
    return valueElem;
  }
}

class TextureEditor extends PropertyEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof THREE.Texture;
  }

  edit(material, propertyName, texture)
  {
    let valueElem = document.createElement("input");
    valueElem.className = "value";
    let value = "";
    if (texture)
    {
      if (texture.name)
      {
        value = texture.name;
      }
      else if (texture.image)
      {
        value = texture.image.src;
      }
    }

    valueElem.value = value;
    valueElem.addEventListener("keydown", event =>
    {
      if (event.keyCode === 13)
      {
        let imagePath = valueElem.value.trim();
        if (value === imagePath)
        {
          this.inspector.stopEdition();
        }
        else
        {
          if (imagePath === "")
          {
            if (material[propertyName] !== null) material.needsUpdate = true;
            material[propertyName] = null;
            this.inspector.endEdition();
          }
          else
          {
            const manager = this.inspector.application.loadingManager;
            if (material[propertyName] === null) material.needsUpdate = true;
            const textureLoader = new THREE.TextureLoader(manager);
            const newTexture = textureLoader.load(imagePath,
              () => this.inspector.endEdition());
            newTexture.name = imagePath;
            material[propertyName] = newTexture;
          }
          if (texture) texture.dispose();
        }
      }
      else if (event.keyCode === 27)
      {
        this.inspector.stopEdition();
      }
    }, false);
    return valueElem;
  }
}

/* InspectorActions */

class InspectorAction extends Action
{
  constructor(inspector)
  {
    super();
    this.inspector = inspector;
  }

  getLabel()
  {
    let name = this.constructor.name;
    if (name.endsWith("Action")) name = name.substring(0, name.length - 6);

    return "action." + name;
  }

  getClassName()
  {
    return "edit";
  }

  isEnabled()
  {
    return false;
  }

  getObjectPath()
  {
    return this.inspector._objectPath;
  }

  getPropertyName()
  {
    return this.inspector._propertyName;
  }

  getFirstPathName()
  {
    const objectPath = this.getObjectPath();
    return objectPath.length === 0 ? null : objectPath[0];
  }

  getLastObject()
  {
    const objectPath = this.getObjectPath();
    let object = this.inspector.object;
    for (let name of objectPath)
    {
      object = object[name];
    }
    return object;
  }
}

class ChangeMaterialAction extends InspectorAction
{
  constructor(inspector)
  {
    super(inspector);
  }

  isEnabled()
  {
    const tabName = this.inspector.propertiesTabbedPane.getVisibleTabName();
    if (tabName === "featured") return false;

    const material = this.inspector.object.material;
    return material && this.getFirstPathName() === "material";
  }

  perform()
  {
    const inspector = this.inspector;
    const object = inspector.object;
    object.material = object.material.clone();
    inspector.application.notifyObjectsChanged(object, "");
  }
}

class SetBuilderAction extends InspectorAction
{
  constructor(inspector)
  {
    super(inspector);
  }

  isEnabled()
  {
    const tabName = this.inspector.propertiesTabbedPane.getVisibleTabName();
    return tabName === "builder";
  }

  perform()
  {
    const inspector = this.inspector;
    const object = inspector.object;
    const dialog = new BuilderDialog(inspector.application, object);
    dialog.show();
  }
}

class AddPropertyAction extends InspectorAction
{
  constructor(inspector)
  {
    super(inspector);
  }

  isEnabled()
  {
    const tabName = this.inspector.propertiesTabbedPane.getVisibleTabName();
    if (tabName === "featured") return false;

    return this.getFirstPathName() === "userData"
           && this.getPropertyName() === null;
  }

  perform()
  {
    const inspector = this.inspector;
    const application = inspector.application;
    const object = inspector.object;
    const dictionary = this.getLastObject();
    const dialog = new PropertyDialog(application, object, dictionary);
    dialog.show();
  }
}

class RemovePropertyAction extends InspectorAction
{
  constructor(inspector)
  {
    super(inspector);
  }

  isEnabled()
  {
    const tabName = this.inspector.propertiesTabbedPane.getVisibleTabName();
    if (tabName === "featured") return false;

    return this.getFirstPathName() === "userData"
           && this.getPropertyName() !== null;
  }

  perform()
  {
    const inspector = this.inspector;
    const application = inspector.application;
    const object = inspector.object;
    const dictionary = this.getLastObject();
    const propertyName = this.getPropertyName();

    ConfirmDialog.create("title.remove_property",
      "question.remove_property", propertyName).setAction(() =>
    {
      delete dictionary[propertyName];

      inspector.populateUserDataTab();
      inspector.populateFeaturedTab();
      application.notifyObjectsChanged(object, inspector);
    }).setI18N(application.i18n).show();
  }
}

class EditPropertiesAction extends InspectorAction
{
  constructor(inspector)
  {
    super(inspector);
  }

  isEnabled()
  {
    const tabName = this.inspector.propertiesTabbedPane.getVisibleTabName();
    if (tabName === "featured") return false;

    return this.getFirstPathName() === "userData";
  }

  perform()
  {
    const inspector = this.inspector;
    const object = inspector.object;
    const application = inspector.application;
    const dialog = new PropertiesDialog(application, object);
    dialog.show();
  }
}

class EditFormulaAction extends InspectorAction
{
  constructor(inspector)
  {
    super(inspector);
  }

  isEnabled()
  {
    const tabName = this.inspector.propertiesTabbedPane.getVisibleTabName();
    if (tabName === "geometry" || tabName === "links" || tabName === "featured")
      return false;

    return this.getPropertyName() !== null || tabName === "formulas";
  }

  perform()
  {
    const inspector = this.inspector;
    const application = inspector.application;
    const object = inspector.object;
    const objectPath = this.getObjectPath();
    const propertyName = this.getPropertyName();

    let formula = null;
    let formulaPath = null;

    if (propertyName)
    {
      formulaPath = inspector.getFormulaPath(objectPath, propertyName);
      formula = Formula.get(object, formulaPath);
    }
    const dialog = new FormulaDialog(application, object, formula);

    if (!formula && formulaPath)
    {
      dialog.pathElem.value = formulaPath;
      let value = this.getLastObject()[propertyName];
      if (value !== null && value !== undefined && typeof value !== "object")
      {
        if (typeof value === "string") value = '"' + value + '"';
        else value = String(value);

        Controls.setCodeEditorDocument(dialog.editorView, value,
          { language: "javascript" });
      }
    }
    dialog.show();
  }
}

class AddControllerAction extends InspectorAction
{
  constructor(inspector)
  {
    super(inspector);
  }

  isEnabled()
  {
    const tabName = this.inspector.propertiesTabbedPane.getVisibleTabName();
    if (tabName !== "controllers") return false;

    return this.getFirstPathName() === "controllers";
  }

  perform()
  {
    const inspector = this.inspector;
    const application = inspector.application;
    const object = inspector.object;
    const dialog = new ControllerDialog(application, object);
    dialog.show();
  }
}

class RemoveControllerAction extends InspectorAction
{
  constructor(inspector)
  {
    super(inspector);
  }

  isEnabled()
  {
    const tabName = this.inspector.propertiesTabbedPane.getVisibleTabName();
    if (tabName !== "controllers") return false;

    const objectPath = this.getObjectPath();
    return objectPath.length === 2 &&
           objectPath[0] === "controllers" &&
           this.getPropertyName() === null;
  }

  perform()
  {
    const inspector = this.inspector;
    const application = inspector.application;
    const controller = this.getLastObject();

    ConfirmDialog.create("title.remove_controller",
      "question.remove_controller", controller.name).setAction(() =>
    {
      controller.destroy(application);
      let object = controller.object;
      delete object.controllers[controller.name];

      inspector.populateControllersTab();
      inspector.populateFeaturedTab();
      application.notifyObjectsChanged(object, inspector);
    }).setI18N(application.i18n).show();
  }
}

class StartControllerAction extends InspectorAction
{
  constructor(inspector)
  {
    super(inspector);
  }

  isEnabled()
  {
    const tabName = this.inspector.propertiesTabbedPane.getVisibleTabName();
    if (tabName !== "controllers") return false;

    const objectPath = this.getObjectPath();
    return objectPath.length === 2 &&
           objectPath[0] === "controllers" &&
           this.getPropertyName() === null &&
           !this.inspector.object.controllers[objectPath[1]]?.isStarted();
  }

  perform()
  {
    const inspector = this.inspector;
    const object = inspector.object;
    const application = inspector.application;
    const controller = this.getLastObject();

    if (!controller.isStarted())
    {
      controller.start();
      inspector.populateControllersTab();
      inspector.populateFeaturedTab();
      application.notifyObjectsChanged(object, inspector);
    }
  }
}

class StopControllerAction extends InspectorAction
{
  constructor(inspector)
  {
    super(inspector);
  }

  isEnabled()
  {
    const tabName = this.inspector.propertiesTabbedPane.getVisibleTabName();
    if (tabName !== "controllers") return false;

    const objectPath = this.getObjectPath();
    return objectPath.length === 2 &&
           objectPath[0] === "controllers" &&
           this.getPropertyName() === null &&
           this.inspector.object.controllers[objectPath[1]]?.isStarted();
  }

  perform()
  {
    const inspector = this.inspector;
    const object = inspector.object;
    const application = inspector.application;
    const controller = this.getLastObject();

    if (controller.isStarted())
    {
      controller.stop();
      inspector.populateControllersTab();
      inspector.populateFeaturedTab();
      application.notifyObjectsChanged(object, inspector);
    }
  }
}

class FeaturedAction extends InspectorAction
{
  constructor(inspector)
  {
    super(inspector);
  }

  isFeatured()
  {
    const inspector = this.inspector;
    const featured = inspector.featuredProperties;
    const objectPath = this.getObjectPath();
    const propertyName = this.getPropertyName();

    let group = featured;
    for (let name of objectPath)
    {
      if (!group[name]) return false;
      group = group[name];
    }
    return group && group[propertyName];
  }
}

class AddFeaturedAction extends FeaturedAction
{
  constructor(inspector)
  {
    super(inspector);
  }

  isEnabled()
  {
    const inspector = this.inspector;
    const tabName = inspector.propertiesTabbedPane.getVisibleTabName();
    if (tabName === "featured") return false;

    const propertyName = this.getPropertyName();
    if (propertyName === null) return false;

    const lastObject = this.getLastObject();
    const value = lastObject[propertyName];
    if (!inspector.isSimpleValue(value)) return false;

    return !this.isFeatured();
  }

  perform()
  {
    const inspector = this.inspector;
    const featured = inspector.featuredProperties;
    const objectPath = this.getObjectPath();
    const propertyName = this.getPropertyName();

    let group = featured;
    for (let name of objectPath)
    {
      if (!group[name])
      {
        group[name] = {};
      }
      group = group[name];
    }
    group[propertyName] = true;

    inspector.populateFeaturedTab();
    inspector.saveFeaturedProperties();
  }
}

class RemoveFeaturedAction extends FeaturedAction
{
  constructor(inspector)
  {
    super(inspector);
  }

  isEnabled()
  {
    return this.getPropertyName() !== null && this.isFeatured();
  }

  perform()
  {
    const inspector = this.inspector;
    const featured = inspector.featuredProperties;
    const objectPath = this.getObjectPath();
    const propertyName = this.getPropertyName();

    let group = featured;
    let groups = [group];
    for (let name of objectPath)
    {
      if (!group[name]) return;
      group = group[name];
      groups.push(group);
    }
    delete group[propertyName];

    for (let i = objectPath.length - 1; i >= 0; i--)
    {
      let name = objectPath[i];
      let igroup = groups[i];
      if (Object.keys(igroup[name]).length === 0)
      {
        delete igroup[name];
      }
    }
    inspector.populateFeaturedTab();
    inspector.saveFeaturedProperties();
  }
}

class RemoveAllFeaturedAction extends FeaturedAction
{
  constructor(inspector)
  {
    super(inspector);
  }

  isEnabled()
  {
    const tabName = this.inspector.propertiesTabbedPane.getVisibleTabName();
    return tabName === "featured";
  }

  perform()
  {
    const inspector = this.inspector;
    const application = inspector.application;

    ConfirmDialog.create("title.remove_featured_properties",
      "question.remove_featured_properties").setAction(() =>
    {
      inspector.featuredProperties = {};
      inspector.populateFeaturedTab();
      inspector.saveFeaturedProperties();
    }).setI18N(application.i18n).show();
  }
}

export { Inspector, PropertyRenderer, PropertyEditor, InspectorAction };