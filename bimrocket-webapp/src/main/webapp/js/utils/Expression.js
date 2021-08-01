/**
 * Expression.js
 *
 * @author realor
 */

import { Application } from "../ui/Application.js";

class Expression
{
  constructor(application, owner, type, label, value, definition)
  {
    this.application = application;
    this.owner = owner; // the Object3D that contains this expression
    this.type = type || "string";
    this.label = label;
    this._definition = null; // format: [object/]property[.property]*
    this._object = null; // referenced object
    this._path = null; // referenced path
    this._value = null; // local value
    this._parsed = true;
    
    if (typeof value !== "undefined")
    {
      this.value = value;
    }
    else if (typeof definition !== "undefined")
    {
      this.definition = definition;
    }
  }

  get definition()
  {
    return this._definition;
  }

  set definition(definition)
  {
    this._definition = definition;
    this._parsed = false;
  }

  get object()
  {
    this._parseIfNeeded();
    return this._object;
  }

  get path()
  {
    this._parseIfNeeded();
    return this._path;
  }

  get value()
  {
    this._parseIfNeeded();
    if (this._object)
    {
      let value = this._object;
      let path = this._path;
      for (let i = 0; i < path.length; i++)
      {
        if (value === null || typeof value !== "object") break;
        value = value[path[i]];
      }
      return value === undefined ? null : value;
    }
    else
    {
      return this._value; // return local value
    }
  }

  set value(value)
  {    
    this._parseIfNeeded();

    switch (this.type)
    {
      case "boolean":
        value = Boolean(value);
        break;
      case "number":
        value = Number(value);
        break;
      case "string":
        value = value === null ? null : String(value);
        break;
    }

    let changedObject = null;

    if (this._object) // have valid definition
    {
      let elem = this._object;
      let path = this._path;
      let i;
      for (i = 0; i < path.length - 1; i++)
      {
        if (elem === null || typeof elem !== "object") return;
        elem = elem[path[i]];
      }
      elem[path[i]] = value;

      changedObject = this._object;
    }
    else // set local value
    {
      this._value = value;
      changedObject = this.owner;
    }

    let changeEvent = {type : "nodeChanged", objects : [changedObject],
      source: this.owner};
    
    this.application.notifyEventListeners("scene", changeEvent);
  }

  isBoundTo(objects)
  {
    return objects.includes(this._object) || 
      (this._object === null && objects.includes(this.owner));
  }
  
  _parseIfNeeded()
  {
    if (this._parsed) return;

    this._parsed = true;
    this._object = null;
    this._path = null;
    this._value = null;

    var definition = this._definition;
    if (definition === null) return;

    let index = definition.indexOf("/");
    if (index === -1) // local reference
    {
      this._object = this.owner;
      this._path = definition.split(".");
    }
    else
    {
      let objectId = definition.substring(0, index);
      let object = this.application.scene.getObjectByName(objectId);
      if (object)
      {
        this._object = object;
        this._path = definition.substring(index + 1).split(".");
      }
    }
  }
}

export { Expression };