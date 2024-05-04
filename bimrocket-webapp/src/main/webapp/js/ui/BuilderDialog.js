/*
 * BuilderDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";
import { Controls } from "./Controls.js";
import { Solid } from "../core/Solid.js";
import { Profile } from "../core/Profile.js";
import { Cord } from "../core/Cord.js";
import { ObjectBuilder } from "../builders/ObjectBuilder.js";
import { SolidBuilder } from "../builders/SolidBuilder.js";
import { ProfileBuilder } from "../builders/ProfileBuilder.js";
import { CordBuilder } from "../builders/CordBuilder.js";
import { I18N } from "../i18n/I18N.js";

class BuilderDialog extends Dialog
{
  constructor(application, object)
  {
    super("title.object_builder");
    this.application = application;
    this.object = object;
    this.setI18N(this.application.i18n);

    this.setSize(300, 400);

    this.bodyElem.classList.add("builder_dialog");

    const listElem = document.createElement("ul");
    this.listElem = listElem;
    this.bodyElem.appendChild(listElem);

    const classes = this.findBuilderClasses(this.object);
    let currentClassName = this.object.builder ?
      this.object.builder.constructor.name : "";

    let inputElem = this.addItem("None", listElem);
    inputElem.checked = true;

    for (let builderClass of classes)
    {
      let inputElem = this.addItem(builderClass.name, listElem);
      if (currentClassName === builderClass.name)
      {
        inputElem.checked = true;
      }
    }

    this.addButton("accept", "button.accept", () =>
    {
      this.onAccept();
    });

    this.addButton("cancel", "button.cancel", () =>
    {
      this.onCancel();
    });
  }

  addItem(className, listElem)
  {
    let id = Controls.getNextId();
    let itemElem = document.createElement("li");
    listElem.appendChild(itemElem);

    let labelElem = document.createElement("label");
    labelElem.htmlFor = id;
    itemElem.appendChild(labelElem);

    let inputElem = document.createElement("input");
    inputElem.type = "radio";
    inputElem.name = "builderClass";
    inputElem.value = className;
    inputElem.id = id;
    labelElem.appendChild(inputElem);

    let nameSpanElem = document.createElement("span");
    nameSpanElem.className = "type";
    nameSpanElem.textContent = className;
    labelElem.appendChild(nameSpanElem);

    return inputElem;
  }

  onAccept()
  {
    let className =
      this.listElem.querySelector('input[name="builderClass"]:checked').value;
    let builderClass = ObjectBuilder.classes[className];
    if (builderClass)
    {
      let builder = new builderClass();
      this.object.builder = builder;
      let name = builderClass.name;
      if (name.endsWith("Builder"))
      {
        name = name.substring(0, name.length - 7);
      }
      this.object.name = name;
    }
    else
    {
      this.object.builder = null;
    }
    this.application.notifyObjectsChanged(this.object);
    this.hide();
  }

  onCancel()
  {
    this.hide();
  }

  findBuilderClasses(object)
  {
    const classes = [];
    for (let className in ObjectBuilder.classes)
    {
      let cls =  ObjectBuilder.classes[className];

      if (!(cls.prototype instanceof CordBuilder)
            && !(cls.prototype instanceof ProfileBuilder)
            && !(cls.prototype instanceof SolidBuilder))
      {
        classes.push(cls);
      }
      else if (object instanceof Cord)
      {
        if (cls.prototype instanceof CordBuilder)
        {
          classes.push(cls);
        }
      }
      else if (object instanceof Profile)
      {
        if (cls.prototype instanceof ProfileBuilder)
        {
          classes.push(cls);
        }
      }
      else if (object instanceof Solid)
      {
        if (cls.prototype instanceof SolidBuilder)
        {
          classes.push(cls);
        }
      }
    }
    classes.sort((class1, class2) =>
    {
      let name1 = class1.name;
      let name2 = class2.name;

      if (name1 < name2) return -1;
      else if (name1 > name2) return 1;
      else return 0;
    });
    return classes;
  }
}

export { BuilderDialog };


