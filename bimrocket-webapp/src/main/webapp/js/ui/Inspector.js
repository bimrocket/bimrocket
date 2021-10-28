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
import { SolidGeometry } from "../core/SolidGeometry.js";
import { Formula } from "../formula/Formula.js";
import { FormulaDialog } from "./FormulaDialog.js";
import { PropertiesDialog } from "./PropertiesDialog.js";
import { PropertyDialog } from "./PropertyDialog.js";
import { BuilderDialog } from "./BuilderDialog.js";
import { ControllerDialog } from "./ControllerDialog.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class Inspector extends Panel
{
  constructor(application)
  {
    super(application);
    this.id = "inspector";
    this.position = "right";

    this.object = null;
    this.state = {};
    this.objectSectionName = 'Object';
    this.materialSectionName = 'Material';
    this.builderSectionName = 'Builder';
    this.formulasSectionName = 'Formulas';
    this.geometrySectionName = 'Geometry';
    this.propertiesSectionName = "Properties";
    this.controllersSectionName = "Controllers";

    this.renderers = [
      new StringRenderer(this),
      new NumberRenderer(this),
      new BooleanRenderer(this),
      new VectorRenderer(this),
      new EulerRenderer(this),
      new FormulaRenderer(this),
      new ColorRenderer(this),
      new Object3DRenderer(this)];
    this.editors = [
      new StringEditor(this),
      new NumberEditor(this),
      new BooleanEditor(this),
      new VectorEditor(this),
      new EulerEditor(this),
      new FormulaEditor(this),
      new ColorEditor(this)];
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
      if (event.objects.length <= 1)
      {
        this.showProperties(event.objects[0]);
      }
      else
      {
        this.showSelectedObjects(event.objects);
      }
    });

    application.addEventListener("scene", event =>
    {
      if (event.type === "nodeChanged" &&
        application.selection.size === 1 &&
        event.objects.includes(application.selection.object) &&
        event.source !== this)
      {
        this.showProperties(application.selection.object);
      }
    });
    this.title = "tool.inspector.label";
  }

  showProperties(object)
  {
    if (this.edition.object) // edition in progress
    {
      this.stopEdition();
    }

    this.object = object;
    this.bodyElem.innerHTML = "";

    if (object)
    {
      let topListElem = document.createElement("ul");
      topListElem.className = "inspector";
      this.bodyElem.appendChild(topListElem);

      if (this.state[this.objectSectionName] === undefined)
      {
        this.state[this.objectSectionName] = "expanded";
      }
      // object
      let objListElem = this.createSection(this.objectSectionName, topListElem);
      this.createReadOnlyProperty("id", object.id, objListElem);
      for (var propertyName in object)
      {
        if (this.isSupportedProperty(propertyName))
        {
          if (this.isReadOnlyProperty(propertyName))
          {
            this.createReadOnlyProperty(propertyName, object[propertyName],
              objListElem);
          }
          else
          {
            this.createWriteableProperty(object, propertyName, objListElem);
          }
        }
      }
      if (object instanceof Solid)
      {
        this.createWriteableProperty(object, "edgesVisible", objListElem);
        this.createWriteableProperty(object, "facesVisible", objListElem);
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

        for (let propertyName of ["uuid", "type", "name", "color", "specular",
          "emissive", "shininess", "opacity", "transparent",
          "emissiveIntensity", "fog"])
        {
          if (material[propertyName] !== undefined)
          {
            let propertyValue = material[propertyName];
            if (propertyValue !== null)
            {
              if (propertyName === "uuid" || propertyName === "type"
                  || material === Solid.EdgeMaterial
                  || material === Solid.FaceMaterial)
              {
                this.createReadOnlyProperty(propertyName, propertyValue,
                  materialListElem);
              }
              else
              {
                this.createWriteableProperty(material, propertyName,
                  materialListElem);
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
        this.createReadOnlyProperty("type", builder.constructor.name,
          builderListElem);

        for (let propertyName in builder)
        {
          let propertyValue = builder[propertyName];
          if (this.isSupportedProperty(propertyName))
          {
            if (propertyValue !== null)
            {
              this.createWriteableProperty(builder, propertyName,
                builderListElem);
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
        this.createWriteableProperty(formulas, path, formulasListElem);
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

        this.createReadOnlyProperty("uuid", geometry.uuid, geomListElem);
        this.createReadOnlyProperty("type", geometry.type, geomListElem);

        if (geometry instanceof SolidGeometry)
        {
          this.createReadOnlyProperty("vertices",
            geometry.vertices.length, geomListElem);
          this.createReadOnlyProperty("faces",
            geometry.faces.length, geomListElem);
          this.createReadOnlyProperty("isManifold",
            geometry.isManifold, geomListElem);
        }
        else if (geometry instanceof THREE.BufferGeometry)
        {
          for (let name in geometry.attributes)
          {
            this.createReadOnlyProperty(name,
              geometry.attributes[name].array.length, geomListElem);
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
            [this.createAddPropertyAction(object, dictionary)]);
          for (let dictPropertyName in dictionary)
          {
            this.createWriteableProperty(dictionary,
              dictPropertyName, dictListElem);
          }
        }
        else
        {
          this.createWriteableProperty(userData, propertyName, propListElem);
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
             this.createRemoveControllerAction(controller)]);
          this.createReadOnlyProperty("type",
            controller.constructor.name, controlListElem);
          this.createReadOnlyProperty("started",
            controller.isStarted(), controlListElem);

          for (let propertyName in controller)
          {
            if (propertyName !== "name" && propertyName !== "object" &&
                !propertyName.startsWith("_"))
            {
              this.createWriteableProperty(controller, propertyName,
                controlListElem);
            }
          }
        }
      }
      this.application.i18n.updateTree(this.bodyElem);
    }
  }

  getObjectClass(object)
  {
    if (object.type === "Object3D" &&
       object.userData.IFC && object.userData.IFC.ifcClassName)
    {
      return object.userData.IFC.ifcClassName;
    }
    else
    {
      return object.type;
    }
  }

  showSelectedObjects(objects)
  {
    this.bodyElem.innerHTML = "";

    const infoElem = document.createElement("div");
    infoElem.className = "inspector_info";
    I18N.set(infoElem, "innerHTML", "message.objects_selected", objects.length);
    this.application.i18n.update(infoElem);
    this.bodyElem.appendChild(infoElem);

    const selectionTree = new Tree(this.bodyElem);

    for (let i = 0; i < objects.length; i++)
    {
      let object = objects[i];
      let label = object.name || object.id;
      let className = this.getObjectClass(object);
      selectionTree.addNode(label,
        event => this.application.selectObjects(event, [object]), className);
    }
  }

  createSection(name, parentElem, actions = null)
  {
    let labelListener = event =>
    {
      let labelElem = event.srcElement || event.target;
      labelElem.className = (labelElem.className === 'expand') ?
        'collapse' : 'expand';
      let listElem = labelElem.parentNode.querySelector('ul');
      listElem.className = (listElem.className === 'expanded') ?
        'collapsed' : 'expanded';
      let sectionName = labelElem.id.substring(8);
      this.state[sectionName] = listElem.className;
    };

    let sectionElem = document.createElement("li");
    sectionElem.className = 'section';
    parentElem.appendChild(sectionElem);

    let labelElem = document.createElement('span');
    labelElem.id = 'section-' + name;
    labelElem.innerHTML = name;
    sectionElem.appendChild(labelElem);
    labelElem.className = this.state[name] === 'collapsed' ?
      'expand' : 'collapse';
    labelElem.addEventListener('click', labelListener);

    if (actions instanceof Array)
    {
      for (let k = 0; k < actions.length; k++)
      {
        let action = actions[k];
        let actionElem = document.createElement('span');
        actionElem.className = action.className;
        I18N.set(actionElem, "alt", action.label);
        I18N.set(actionElem, "title", action.label);
        actionElem.setAttribute("role", "button");
        actionElem.addEventListener("click", action.listener);
        sectionElem.appendChild(actionElem);
      }
    }

    let listElem = document.createElement("ul");
    listElem.className = this.state[name];
    sectionElem.appendChild(listElem);

    return listElem;
  }

  createReadOnlyProperty(propertyLabel, propertyValue, parentElem)
  {
    this.createProperty(propertyLabel, propertyValue, null, null, parentElem);
  }

  createWriteableProperty(object, propertyName, parentElem)
  {
    this.createProperty(null, null, object, propertyName, parentElem);
  };

  createProperty(propertyLabel, propertyValue, object, propertyName, parentElem)
  {
    if (propertyValue === null && object && propertyName)
    {
      propertyValue = object[propertyName];
    }
    let renderer = this.getRenderer(propertyValue);
    if (renderer)
    {
      let propElem = document.createElement('li');
      propElem.className = "property " + renderer.getClassName(propertyValue);
      parentElem.appendChild(propElem);
      if (!propertyLabel)
      {
        propertyLabel = propertyName;
      }
      let labelElem = document.createElement('span');
      labelElem.innerHTML = propertyLabel + ':';
      labelElem.className = 'label';
      propElem.appendChild(labelElem);

      let editor = object && propertyName ?
        this.getEditor(propertyValue) : null;

      this.createValueElem(propertyValue, renderer, editor,
        object, propertyName, propElem);

      if (editor)
      {
        labelElem.addEventListener("click", event =>
          this.startEdition(object, propertyName, renderer, editor, propElem),
          false);
        propElem.className += " editable";
      }
    }
  }

  createValueElem(propertyValue, renderer, editor, object,
    propertyName, propElem)
  {
    let valueElem = renderer.render(propertyValue);
    if (valueElem)
    {
      propElem.appendChild(valueElem);

      if (editor)
      {
        valueElem.addEventListener("click", () =>
          this.startEdition(object, propertyName, renderer, editor, propElem),
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
      label: "label.change_material",
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
      label: "label.object_builder",
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
      label: "label.add_property",
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
      label: "label.edit_properties",
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
      label: "label.add_formula",
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
      label: "label.add_controller",
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
      label: "label.remove_controller",
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
      label: "label.start_controller",
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
      label: "label.stop_controller",
      listener : listener
    };
  }

  startEdition(object, propertyName, renderer, editor, propElem)
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

    let valueElem = editor.edit(propertyValue);
    if (valueElem)
    {
      let oldValueElem = propElem.childNodes[propElem.childNodes.length - 1];
      propElem.removeChild(oldValueElem);
      propElem.appendChild(valueElem);
      if (valueElem.focus) valueElem.focus();
    }
  }

  endEdition(value)
  {
    let object = this.edition.object;
    let propertyName = this.edition.propertyName;
    let oldValue = object[propertyName];

    if (oldValue !== null && typeof oldValue === "object")
    {
      if (typeof oldValue.copy === "function")
      {
        object[propertyName].copy(value);
        if (object instanceof THREE.Object3D)
        {
          object.updateMatrix();
        }
      }
      else
      {
        object[propertyName] = value;
      }
    }
    else
    {
      object[propertyName] = value;
    }
    this.stopEdition();

    this.application.notifyObjectsChanged(this.object, this);
  }

  stopEdition()
  {
    let propElem = this.edition.propElem;
    let valueElem = propElem.childNodes[propElem.childNodes.length - 1];
    propElem.removeChild(valueElem);
    let propertyValue = this.edition.object[this.edition.propertyName];

    this.createValueElem(propertyValue, this.edition.renderer,
      this.edition.editor, this.edition.object, this.edition.propertyName,
      propElem);

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

  isSupportedProperty(propertyName)
  {
    if (propertyName[0] === '_') return false;
    if (propertyName === 'material') return false;
    return true;
  }

  isReadOnlyProperty(propertyName)
  {
    if (propertyName === 'type') return true;
    if (propertyName === 'uuid') return true;
    if (propertyName.indexOf("is") === 0) return true;

    return false;
  }

  getRenderer(value)
  {
    let renderer = null;
    let i = 0;
    while (i < this.renderers.length && renderer === null)
    {
      if (this.renderers[i].isSupported(value))
      {
        renderer = this.renderers[i];
      }
      else i++;
    }
    return renderer;
  }

  getEditor(value)
  {
    let editor = null;
    let i = 0;
    while (i < this.editors.length && editor === null)
    {
      if (this.editors[i].isSupported(value))
      {
        editor = this.editors[i];
      }
      else i++;
    }
    return editor;
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

  render(value) // returns elem
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

  render(text)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    valueElem.innerHTML = text;
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

  render(number)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    valueElem.innerHTML = Math.round(number * 1000) / 1000;
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

  render(value)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    valueElem.innerHTML = value;
    return valueElem;
  }
}

class VectorRenderer extends PropertyRenderer
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

  render(vector)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    let round = function(value)
    {
      var precision = 1000;
      return Math.round(precision * value) / precision;
    };
    let out = '(' + round(vector.x) + ', ' +
      round(vector.y) + ', ' +
      round(vector.z) + ')';
    valueElem.innerHTML = out;
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

  render(euler)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    let angle = function(value)
    {
      var precision = 1000;
      return Math.round(precision *
        THREE.MathUtils.radToDeg(value)) / precision;
    };
    let out = '(' + angle(euler.x) + 'º, ' +
      angle(euler.y) + 'º, ' +
      angle(euler.z) + 'º)';
    valueElem.innerHTML = out;
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

  render(formula)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    valueElem.innerHTML = formula.expression;
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

  render(color)
  {
    const rgb = "rgb(" + Math.round(255 * color.r) +
      " ," + Math.round(255 * color.g) + ", " + Math.round(255 * color.b) + ")";

    let valueElem = document.createElement("span");
    valueElem.className = "value";

    let codeElem = document.createElement("span");
    codeElem.innerHTML = rgb;
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

  render(object)
  {
    let valueElem = document.createElement("a");
    valueElem.className = "value";
    valueElem.innerHTML = object.name || "object-" + object.id;
    valueElem.addEventListener("click",
      () => this.inspector.application.selection.set(object));
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

  edit(value) // returns the editor element
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

  edit(text)
  {
    let valueElem = document.createElement("input");
    valueElem.className = "value";
    valueElem.value = text;
    valueElem.addEventListener("keyup", event =>
    {
      if (event.keyCode === 13)
      {
        this.inspector.endEdition(valueElem.value);
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

  edit(number)
  {
    let valueElem = document.createElement("input");
    valueElem.className = "value";
    valueElem.value = "" + number;
    valueElem.type = "number";
    valueElem.addEventListener("keyup", event =>
    {
      if (event.keyCode === 13)
      {
        number = parseFloat(valueElem.value);
        if (!isNaN(number))
        {
          this.inspector.endEdition(number);
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

  edit(value)
  {
    let checked = value;
    this.inspector.endEdition(!checked);
    return null;
  }
}

class DimensionEditor extends PropertyEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  formatValue(value)
  {
    return value;
  }

  createInstance(x, y, z)
  {
    return {"x": x, "y": y, "z": z};
  }

  edit(vector)
  {
    let dimId = "dim_edit_";

    const parseDimension = dim =>
    {
      let valueElem = document.getElementById(dimId + dim);
      let value = valueElem.value;
      let num = parseFloat(value);
      return isNaN(num) ? vector[dim] : num;
    };

    const endEdition = () =>
    {
      let x = parseDimension("x");
      let y = parseDimension("y");
      let z = parseDimension("z");
      this.inspector.endEdition(this.createInstance(x, y, z));
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
      labelElem.innerHTML = dim + ":";
      labelElem.htmlFor = dimId + dim;

      let valueElem = document.createElement("input");
      valueElem.id = dimId + dim;
      valueElem.type = "number";
      valueElem.className = "value";
      valueElem.value = this.formatValue(vector[dim]);

      valueElem.addEventListener("keyup", keyListener, false);

      itemElem.appendChild(labelElem);
      itemElem.appendChild(valueElem);

      return itemElem;
    };

    let listElem = document.createElement("ul");
    listElem.className = "list_3";
    listElem.appendChild(createDimensionEditor(vector, "x"));
    listElem.appendChild(createDimensionEditor(vector, "y"));
    listElem.appendChild(createDimensionEditor(vector, "z"));

    listElem.focus = () => document.getElementById(dimId + "x").focus();

    return listElem;
  }
}

class VectorEditor extends DimensionEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof THREE.Vector3;
  }

  createInstance(x, y, z)
  {
    return new THREE.Vector3(x, y, z);
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

  createInstance(x, y, z)
  {
    let xrad = THREE.MathUtils.degToRad(x);
    let yrad = THREE.MathUtils.degToRad(y);
    let zrad = THREE.MathUtils.degToRad(z);

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

  edit(formula)
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

  edit(color)
  {
    let dimId = "color_edit_";

    const parseDimension = dim =>
    {
      let valueElem = document.getElementById(dimId + dim);
      let value = valueElem.value;
      let num = parseFloat(value);
      return isNaN(num) ? color[dim] : num;
    };

    const endEdition = () =>
    {
      let r = parseDimension("r") / 255;
      let g = parseDimension("g") / 255;
      let b = parseDimension("b") / 255;
      this.inspector.endEdition(new THREE.Color(r, g, b));
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

    const createDimensionEditor = (color, dim) =>
    {
      let itemElem = document.createElement("li");

      let labelElem = document.createElement("label");
      labelElem.innerHTML = dim + ":";
      labelElem.htmlFor = dimId + dim;

      let valueElem = document.createElement("input");
      valueElem.id = dimId + dim;
      valueElem.type = "number";
      valueElem.className = "value";
      valueElem.value = color[dim] * 255;
      valueElem.min = 0;
      valueElem.max = 255;
      valueElem.step = 1;
      valueElem.addEventListener("keyup", keyListener, false);

      itemElem.appendChild(labelElem);
      itemElem.appendChild(valueElem);

      return itemElem;
    };

    let listElem = document.createElement("ul");
    listElem.className = "list_3";

    listElem.appendChild(createDimensionEditor(color, "r"));
    listElem.appendChild(createDimensionEditor(color, "g"));
    listElem.appendChild(createDimensionEditor(color, "b"));

    listElem.focus = () => document.getElementById(dimId + "r").focus();

    return listElem;
  }
}

export { Inspector };