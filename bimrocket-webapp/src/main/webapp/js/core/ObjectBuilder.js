/*
 * ObjectBuilder.js
 *
 * @author realor
 */

import { Solid } from "./Solid.js";
import * as THREE from "../lib/three.module.js";

class ObjectBuilder
{
  static DEFAULT_INSTANCE = new ObjectBuilder();

  constructor()
  {
  }

  /* virtual method call by static mark method */
  performMarking(object)
  {
    const children = object.children;
    let i = object instanceof Solid ? 2 : 0;
    let childrenNeedRebuild = false;
    while (i < children.length)
    {
      let child = children[i];
      ObjectBuilder.mark(child);
      if (child.needsRebuild)
      {
        childrenNeedRebuild = true;
      }
      i++;
    }
    if (childrenNeedRebuild)
    {
      object.needsRebuild = true;
    }
  }

  /* virtual method call by static build method */
  performBuild(object)
  {
    const children = object.children;
    let i = object instanceof Solid ? 2 : 0;
    while (i < children.length)
    {
      ObjectBuilder.build(children[i]);
      i++;
    }
  }

  /* static methods */

  static mark(object)
  {
    if (object.needsMarking === false) return;

    object.needsMarking = false;

    let builder = object.builder || ObjectBuilder.DEFAULT_INSTANCE;
    builder.performMarking(object);
  }

  static build(object)
  {
    if (object.needsRebuild === false) return;

    object.needsRebuild = false;

    const builder = object.builder || ObjectBuilder.DEFAULT_INSTANCE;
    builder.performBuild(object);
  }
}

export { ObjectBuilder };

