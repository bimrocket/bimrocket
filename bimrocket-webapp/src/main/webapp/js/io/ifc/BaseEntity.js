/**
 * BaseEntity.js
 *
 * @author realor
 */

import * as helpers from "./helpers.js";

class BaseEntity
{
  get helper()
  {
    if (this._helper === undefined)
    {
      let ifcClass = this.constructor;
      while (ifcClass)
      {
        let helperClass = helpers[ifcClass.name + "Helper"];
        if (helperClass)
        {
          this._helper = new helperClass(this);
          break;
        }
        let ifcSuperClass = ifcClass.__proto__;
        ifcClass = ifcSuperClass.name ?
          ifcClass.schema[ifcSuperClass.name] : null;
      }
    }
    return this._helper;
  }

  toJSON()
  {
    let names = Object.getOwnPropertyNames(this);
    let json = { "ifcClassName" : this.constructor.name };
    for (let i = 0; i < names.length; i++)
    {
      let name = names[i];
      if (name  !== "_helper")
      {
        json[name] = this[name];
      }
    }
    return json;
  }
}

function registerIfcClass(ifcClass, schema)
{
  const ifcClassName = ifcClass.name;
  schema[ifcClassName] = ifcClass;
  schema[ifcClassName.toUpperCase()] = ifcClass;
}

export { BaseEntity, registerIfcClass };



