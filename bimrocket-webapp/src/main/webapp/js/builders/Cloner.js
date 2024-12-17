/**
 * Cloner.js
 *
 * @author realor
 */

import { Solid } from "../core/Solid.js";
import { Profile } from "../core/Profile.js";
import { Cord } from "../core/Cord.js";
import { ObjectBuilder } from "./ObjectBuilder.js";

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
    if (this.objectToClone)
    {
      action(this.objectToClone);
    }
  }

  updateReferences(object, update)
  {
    let newObjectToClone = update(this.objectToClone);
    if (newObjectToClone !== null)
    {
      this.objectToClone = newObjectToClone;
      return true;
    }
    return false;
  }

  performBuild(object)
  {
    if (this.objectToClone === undefined) return false;

    const clone = object =>
    {
      let clonedObject = object.clone(false);
      if (this.cloneVisible) clonedObject.visible = true;

      if (object instanceof Solid
         || object instanceof Profile
         || object instanceof Cord)
      {
        // do not clone children
      }
      else // object is Group or Object3D
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

  isGeometryBuilder(object)
  {
    return false;
  }

  isChildrenBuilder(object)
  {
    return true;
  }

  copy(source)
  {
    this.objectToClone = source.objectToClone;
    this.cloneVisible = source.cloneVisible;

    return this;
  }
};

ObjectBuilder.addClass(Cloner);

export { Cloner };


