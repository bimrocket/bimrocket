/**
 * Inspector.js
 *
 * @author realor
 */

import { Panel } from "./Panel.js";
import { Tree } from "./Tree.js";
import { Dialog } from "./Dialog.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { Application } from "./Application.js";
import { Solid } from "../core/Solid.js";
import { Text } from "../core/Text.js";
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
import * as THREE from "../lib/three.module.js";

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
    this.objectSectionName = 'Object';
    this.materialSectionName = 'Material';
    this.builderSectionName = 'Builder';
    this.formulasSectionName = 'Formulas';
    this.geometrySectionName = 'Geometry';
    this.propertiesSectionName = "Properties";
    this.controllersSectionName = "Controllers";
    this.linksSectionName = "Links";

    this.renderers = {};
    this.editors = {};

    this.addRenderer(StringRenderer);
    this.addRenderer(NumberRenderer);
    this.addRenderer(BooleanRenderer);
    this.addRenderer(Vector2Renderer);
    this.addRenderer(Vector3Renderer);
    this.addRenderer(EulerRenderer);
    this.addRenderer(FormulaRenderer);
    this.addRenderer(ColorRenderer);
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
    this.addEditor(TextureEditor);

    this.objectPanelElem = document.createElement("div");
    this.bodyElem.appendChild(this.objectPanelElem);
    this.objectPanelElem.className = "inspector_card";

    this.toolBarElem = document.createElement("div");
    this.objectPanelElem.appendChild(this.toolBarElem);
    this.toolBarElem.className = "inspector_toolbar";

    this.listButton = Controls.addButton(this.toolBarElem,
      "list", null, event =>
    {
      this.listPanelElem.style.display = "";
      this.objectPanelElem.style.display = "none";
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
    this.objectPanelElem.appendChild(this.propertiesElem);
    this.propertiesElem.className = "inspector_properties";

    this.listPanelElem = document.createElement("div");
    this.bodyElem.appendChild(this.listPanelElem);
    this.listPanelElem.className = "inspector_card";

    this.objectIndex = -1;
    this.anchoredSectionName = null;

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
          this.showProperties(this.object);
        }
      }
    });
    this.title = "tool.inspector.label";
  }

  showSelectedObjects(objects)
  {
    this.listPanelElem.style.display = "";
    this.objectPanelElem.style.display = "none";

    this.propertiesElem.innerHTML = "";
    this.listPanelElem.innerHTML = "";

    this.objects = objects;
    this.objectIndex = objects.length >= 0 ? 0 : -1;

    const infoElem = document.createElement("div");
    infoElem.className = "inspector_info";
    I18N.set(infoElem, "textContent", "message.objects_selected", objects.length);
    this.application.i18n.update(infoElem);
    this.listPanelElem.appendChild(infoElem);

    const selectionTree = new Tree(this.listPanelElem);

    for (let i = 0; i < objects.length; i++)
    {
      let object = objects[i];
      let label = object.name || object.id;
      let className = ObjectUtils.getObjectClassNames(object);
      selectionTree.addNode(label,
        event =>
        {
          this.showProperties(object);
          this.centerObject();
        }, className);
    }
  }

  showProperties(object)
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

    this.propertiesElem.innerHTML = "";
    this.objectPanelElem.style.display = "";
    this.listPanelElem.style.display = "none";
    let anchoredSectionElem = null;

    if (object)
    {
      let topListElem = document.createElement("ul");
      topListElem.className = "inspector";
      this.propertiesElem.appendChild(topListElem);

      if (this.state[this.objectSectionName] === undefined)
      {
        this.state[this.objectSectionName] = "expanded";
      }
      // object
      let objListElem = this.createSection(this.objectSectionName, topListElem,
        [this.createClearAnchorSectionAction()]);
      this.createReadOnlyProperty(objListElem, object, "id");
      for (let propertyName in object)
      {
        if (this.isSupportedProperty(propertyName))
        {
          if (this.isReadOnlyProperty(propertyName))
          {
            this.createReadOnlyProperty(objListElem, object, propertyName);
          }
          else
          {
            this.createWriteableProperty(objListElem, object, propertyName);
          }
        }
      }
      if (object instanceof Solid)
      {
        this.createWriteableProperty(objListElem, object, "edgesVisible");
        this.createWriteableProperty(objListElem, object, "facesVisible");
        this.createWriteableProperty(objListElem, object, "castShadow");
        this.createWriteableProperty(objListElem, object, "receiveShadow");
      }

      if (object instanceof Text)
      {
        this.createWriteableProperty(objListElem, object, "text");
        this.createWriteableProperty(objListElem, object, "fontSize");
        this.createWriteableProperty(objListElem, object, "color");
        this.createWriteableProperty(objListElem, object, "backgroundColor");
        this.createWriteableProperty(objListElem, object, "maxWidth");
      }

      let material = object.material;
      if (material)
      {
        // material
        if (this.state[this.materialSectionName] === undefined)
        {
          this.state[this.materialSectionName] = "expanded";
        }
        let materialListElem = this.createSection(this.materialSectionName,
          topListElem, [this.createChangeMaterialAction(object)]);

        for (let propertyName of Inspector.mainMaterialProperties)
        {
          if (propertyName in material)
          {
            if (this.isReadOnlyProperty(propertyName)
                || material === Solid.EdgeMaterial
                || material === Solid.FaceMaterial)
            {
              this.createReadOnlyProperty(materialListElem,
                material, propertyName);
            }
            else
            {
              if (propertyName === "map")
              {
                this.createWriteableProperty(materialListElem,
                  material, propertyName,
                  this.renderers.TextureRenderer, this.editors.TextureEditor);
              }
              else
              {
                this.createWriteableProperty(materialListElem,
                  material, propertyName);
              }
            }
          }
        }
      }

      // builder
      if (this.state[this.builderSectionName] === undefined)
      {
        this.state[this.builderSectionName] = "expanded";
      }
      let builderListElem = this.createSection(this.builderSectionName,
        topListElem, [this.createSetBuilderAction(object)]);

      let builder = object.builder;
      if (builder)
      {
        this.createReadOnlyProperty(builderListElem, builder.constructor,
          "type", builder.constructor.name);

        for (let propertyName in builder)
        {
          let propertyValue = builder[propertyName];
          if (this.isSupportedProperty(propertyName))
          {
            if (propertyValue !== null)
            {
              this.createWriteableProperty(builderListElem,
                builder, propertyName);
            }
          }
        }
      }

      // formulas
      if (this.state[this.formulasSectionName] === undefined)
      {
        this.state[this.formulasSectionName] = "expanded";
      }
      let formulasListElem = this.createSection(this.formulasSectionName,
        topListElem, [this.createAddFormulaAction(object)]);
      const formulas = Formula.getAll(object);
      for (let path in formulas)
      {
        this.createWriteableProperty(formulasListElem, formulas, path);
      }

      // geometry
      let geometry = object.geometry;
      if (geometry)
      {
        if (this.state[this.geometrySectionName] === undefined)
        {
          this.state[this.geometrySectionName] = "expanded";
        }
        let geomListElem = this.createSection(this.geometrySectionName,
          topListElem);

        this.createReadOnlyProperty(geomListElem, geometry, "id");
        this.createReadOnlyProperty(geomListElem, geometry, "uuid");
        this.createReadOnlyProperty(geomListElem, geometry, "type");

        if (geometry instanceof SolidGeometry)
        {
          this.createReadOnlyProperty(geomListElem, geometry, "vertices",
            geometry.vertices.length);
          this.createReadOnlyProperty(geomListElem, geometry, "faces",
            geometry.faces.length);
          this.createReadOnlyProperty(geomListElem, geometry, "isManifold");
          this.createReadOnlyProperty(geomListElem, geometry, "smoothAngle");
        }
        else if (geometry instanceof THREE.BufferGeometry)
        {
          for (let name in geometry.attributes)
          {
            let attribute = geometry.attributes[name];
            this.createReadOnlyProperty(geomListElem, attribute,
              name, attribute.array.length + " / " + attribute.itemSize);
          }
          if (geometry.getIndex())
          {
            let attribute = geometry.getIndex();
            this.createReadOnlyProperty(geomListElem, attribute,
              "index", attribute.array.length + " / " + attribute.itemSize);
          }
        }
      }

      // userData
      let userData = object.userData;
      if (this.state[this.propertiesSectionName] === undefined)
      {
        this.state[this.propertiesSectionName] = "expanded";
      }

      let propListElem = this.createSection(this.propertiesSectionName,
        topListElem, [this.createAddPropertyAction(object, userData),
        this.createEditPropertiesAction(object)]);

      for (let propertyName in userData)
      {
        let propertyValue = userData[propertyName];
        if (propertyValue !== null && typeof propertyValue === "object")
        {
          let dictName = propertyName;
          let dictionary = propertyValue;
          if (this.state[dictName] === undefined)
          {
            this.state[dictName] = "expanded";
          }

          let dictListElem = this.createSection(dictName, propListElem,
            [this.createAddPropertyAction(object, dictionary),
            this.createAnchorSectionAction(object, dictName)]);
          for (let dictPropertyName in dictionary)
          {
            this.createWriteableProperty(dictListElem, dictionary,
              dictPropertyName);
          }
          if (dictName === this.anchoredSectionName)
          {
            anchoredSectionElem = dictListElem.parentElement;
          }
        }
        else
        {
          this.createWriteableProperty(propListElem, userData, propertyName);
        }
      }

      // controllers
      let controllers = object.controllers;
      if (this.state[this.controllersSectionName] === undefined)
      {
        this.state[this.controllersSectionName] = "expanded";
      }
      let controllersListElem =
        this.createSection(this.controllersSectionName, topListElem,
        [this.createAddControllerAction(object)]);
      if (controllers)
      {
        for (let name in controllers)
        {
          let controller = controllers[name];
          if (this.state[name] === undefined)
          {
            this.state[name] = 'expanded';
          }
          let controlListElem = this.createSection(name, controllersListElem,
            [this.createStartControllerAction(controller),
             this.createStopControllerAction(controller),
             this.createRemoveControllerAction(controller),
             this.createAnchorSectionAction(object, name)]);
          this.createReadOnlyProperty(controlListElem, controller, "type",
            controller.constructor.name);
          this.createReadOnlyProperty(controlListElem, controller, "started",
            controller.isStarted());

          for (let propertyName in controller)
          {
            if (propertyName !== "name" && propertyName !== "object" &&
                !propertyName.startsWith("_"))
            {
              this.createWriteableProperty(controlListElem, controller,
                propertyName);
            }
          }
          if (name === this.anchoredSectionName)
          {
            anchoredSectionElem = controlListElem.parentElement;
          }
        }
      }

      // links
      let links = object.links;
      if (this.state[this.linksSectionName] === undefined)
      {
        this.state[this.linksSectionName] = "expanded";
      }
      let linksListElem =
        this.createSection(this.linksSectionName, topListElem);
      if (links)
      {
        for (let name in links)
        {
          this.createReadOnlyProperty(linksListElem, links, name);
        }
      }

      this.application.i18n.updateTree(this.objectPanelElem);

      if (objectChanged)
      {
        this.markAnchoredSection(anchoredSectionElem);
      }
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
      this.propertiesElem.style.top = "0px";
    }
    else
    {
      this.toolBarElem.style.display = "";
      this.propertiesElem.style.top = "";
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

  createSection(name, parentElem, actions = null)
  {
    let labelListener = event =>
    {
      let labelElem = event.target;
      labelElem.className = (labelElem.className === 'expand') ?
        'collapse' : 'expand';
      let listElem = labelElem.parentNode.querySelector('ul');
      listElem.className = (listElem.className === 'expanded') ?
        'collapsed' : 'expanded';
      let sectionName = labelElem.id.substring(8);
      this.state[sectionName] = listElem.className;
    };

    let sectionElem = document.createElement("li");
    sectionElem.className = "section";
    parentElem.appendChild(sectionElem);

    if (this.state[name] === "expanded"
        && this.firstExpandedSectionElem === null)
    {
      this.firstExpandedSectionElem = sectionElem;
    }

    let labelElem = document.createElement("a");
    labelElem.href = "#";
    labelElem.id = 'section-' + name;
    labelElem.textContent = name;
    sectionElem.appendChild(labelElem);
    labelElem.className = this.state[name] === 'collapsed' ?
      'expand' : 'collapse';
    labelElem.addEventListener('click', labelListener);

    if (actions instanceof Array)
    {
      for (let action of actions)
      {
        let actionElem = document.createElement("button");
        actionElem.className = action.className;
        I18N.set(actionElem, "alt", action.label);
        I18N.set(actionElem, "title", action.label);
        actionElem.addEventListener("click", action.listener);
        sectionElem.appendChild(actionElem);
      }
    }

    let listElem = document.createElement("ul");
    listElem.className = this.state[name];
    sectionElem.appendChild(listElem);

    return listElem;
  }

  createReadOnlyProperty(parentElem, object, propertyName,
    propertyValue = object[propertyName])
  {
    this.createProperty(parentElem, object, propertyName, propertyValue);
  }

  createWriteableProperty(parentElem, object, propertyName, renderer, editor)
  {
    let propertyValue = object[propertyName];

    editor = editor || this.getEditor(propertyValue);

    this.createProperty(parentElem, object, propertyName, propertyValue,
      renderer, editor);
  };

  createProperty(parentElem, object, propertyName, propertyValue,
    renderer = null, editor = null)
  {
    renderer = renderer || this.getRenderer(propertyValue);
    if (renderer)
    {
      let propElem = document.createElement('li');
      if (object instanceof THREE.Object3D)
      {
        propElem.id = "inspector_" + propertyName;
      }
      propElem.className = "property " + renderer.getClassName(propertyValue);
      parentElem.appendChild(propElem);

      let labelElem = document.createElement('a');
      labelElem.href = '#';
      labelElem.textContent = propertyName + ':';
      labelElem.className = 'label';
      propElem.appendChild(labelElem);

      this.createValueElem(propElem, object, propertyName, propertyValue,
        renderer, editor);

      if (editor)
      {
        labelElem.addEventListener("click", event =>
        {
          event.preventDefault();
          this.startEdition(propElem, object, propertyName, renderer, editor);
        }, false);
        propElem.className += " editable";
      }
    }
  }

  createValueElem(propElem, object, propertyName, propertyValue,
    renderer, editor)
  {
    let valueElem = renderer.render(propertyValue, !Boolean(editor));
    if (valueElem)
    {
      propElem.appendChild(valueElem);

      if (editor)
      {
        valueElem.addEventListener("click", () =>
          this.startEdition(propElem, object, propertyName, renderer, editor),
          false);
      }
    }
  }

  createChangeMaterialAction(object)
  {
    const listener = () =>
    {
      object.material = object.material.clone();
      this.application.notifyObjectsChanged(this.object, "");
    };

    return {
      className: "button edit",
      label: "button.change_material",
      listener : listener
    };
  }

  createSetBuilderAction(object)
  {
    const listener = () =>
    {
      const dialog = new BuilderDialog(this.application, object);
      dialog.show();
    };

    return {
      className: "button edit",
      label: "button.object_builder",
      listener : listener
    };
  }

  createAddPropertyAction(object, dictionary)
  {
    const listener = () =>
    {
      const dialog = new PropertyDialog(this.application, object, dictionary);
      dialog.show();
    };

    return {
      className: "button add",
      label: "button.add_property",
      listener : listener
    };
  }

  createEditPropertiesAction(object)
  {
    const listener = () =>
    {
      const dialog = new PropertiesDialog(this.application, object);
      dialog.show();
    };

    return {
      className: "button edit",
      label: "button.edit_properties",
      listener : listener
    };
  }

  createClearAnchorSectionAction()
  {
    const listener = event =>
    {
      this.anchoredSectionName = null;
      this.markAnchoredSection();
    };

    return {
      className: "button anchor",
      label: "button.anchor_section",
      listener : listener
    };
  }

  createAnchorSectionAction(object, dictName)
  {
    const listener = event =>
    {
      this.anchoredSectionName = dictName;

      const elem = event.target.parentElement;
      this.markAnchoredSection(elem);
    };

    return {
      className: "button anchor",
      label: "button.anchor_section",
      listener : listener
    };
  }

  createAddFormulaAction(object)
  {
    const listener = () =>
    {
      const dialog = new FormulaDialog(this.application, object);
      dialog.show();
    };

    return {
      className: "button add",
      label: "button.add_formula",
      listener : listener
    };
  }

  createAddControllerAction(object)
  {
    const listener = () =>
    {
      const dialog = new ControllerDialog(this.application, object);
      dialog.show();
    };

    return {
      className: "button add",
      label: "button.add_controller",
      listener : listener
    };
  }

  createRemoveControllerAction(controller)
  {
    const listener = () =>
    {
      ConfirmDialog.create("title.remove_controller",
        "question.remove_controller", controller.name).setAction(() =>
      {
        controller.stop();
        let object = controller.object;
        delete object.controllers[controller.name];
        this.showProperties(object);
      }).setI18N(this.application.i18n).show();
    };

    return {
      className: "button remove",
      label: "button.remove_controller",
      listener : listener
    };
  }

  createStartControllerAction(controller)
  {
    const listener = () =>
    {
      if (!controller.isStarted())
      {
        controller.start();
        let object = controller.object;
        this.showProperties(object);
      }
    };

    return {
      className: "button start",
      label: "button.start_controller",
      listener : listener
    };
  }

  createStopControllerAction(controller)
  {
    const listener = () =>
    {
      if (controller.isStarted())
      {
        controller.stop();
        let object = controller.object;
        this.showProperties(object);
      }
    };

    return {
      className: "button stop",
      label: "button.stop_controller",
      listener : listener
    };
  }

  markAnchoredSection(sectionElem)
  {
    let anchored = this.propertiesElem.getElementsByClassName("anchored");
    for (let anchoredElem of anchored)
    {
      anchoredElem.classList.remove("anchored");
    }

    if (sectionElem)
    {
      sectionElem.firstChild.classList.add("anchored");
      this.propertiesElem.scrollTo(0, sectionElem.offsetTop);
    }
    else
    {
      this.propertiesElem.scrollTo(0, 0);
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
    let propElem = document.getElementById("inspector_" + propertyName);
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
    valueElem.addEventListener("click",
      () => this.inspector.application.selection.set(object));
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

    const dialog = new FormulaDialog(inspector.application,
      inspector.object, formula);
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

export { Inspector };