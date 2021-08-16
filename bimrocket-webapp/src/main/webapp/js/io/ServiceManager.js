/**
 * ServiceManager.js
 *
 * @author realor
 */

import { Service } from "./Service.js";

class ServiceManager
{
  static classes = {};

  static addClass(serviceClass)
  {
    this.classes[serviceClass.name] = serviceClass;
  }

  /* returns an array with the names of the services of the given class */
  static getTypesOf(serviceClass)
  {
    let types = [];
    for (let className in this.classes)
    {
      let cls = this.classes[className];
      if (cls.prototype instanceof serviceClass || cls === serviceClass)
      {
        types.push(className);
      }
    }
    return types;
  }
}

export { ServiceManager };


