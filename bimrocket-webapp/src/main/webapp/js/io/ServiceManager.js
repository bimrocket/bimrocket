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

  static getClassesForType(type)
  {
    let typeClasses = [];
    for (let className in this.classes)
    {
      let cls = this.classes[className];
      if (cls.type === type)
      {
        typeClasses.push(className);
      }
    }
    return typeClasses;
  }
}

export { ServiceManager };


