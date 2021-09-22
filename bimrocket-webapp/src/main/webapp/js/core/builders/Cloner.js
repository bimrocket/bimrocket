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
  }

  performMarking(object)
  {
    ObjectBuilder.mark(this.objectToClone);
    object.needsRebuild = this.objectToClone.needsRebuild;
  }

  performBuild(object)
  {
    const clone = object =>
    {
      let clonedObject = object.clone(false);
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
  }
};

export { Cloner };


