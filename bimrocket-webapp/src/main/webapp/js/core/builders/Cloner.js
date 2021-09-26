/**
 * Cloner.js
 *
 * @author realor
 */

import { Solid } from "../Solid.js";
import { ObjectBuilder } from "../ObjectBuilder.js";
import * as THREE from "../../lib/three.module.js";

class Cloner extends ObjectBuilder
{
  constructor(objectToClone)
  {
    super();
    this.objectToClone = objectToClone;
    this.cloneVisible = true;
  }

  traverseDependencies(object, action)
  {
    action(this.objectToClone);
  }

  performBuild(object)
  {
    const clone = object =>
    {
      let clonedObject = object.clone(false);
      if (this.cloneVisible) clonedObject.visible = true;
      if (!(clonedObject instanceof Solid))
      {
        for (let child of object.children)
        {
          clonedObject.add(clone(child));
        }
      }
      return clonedObject;
    };
    object.clear();
    object.add(clone(this.objectToClone));
    object.updateMatrix();

    return true;
  }
};

export { Cloner };


