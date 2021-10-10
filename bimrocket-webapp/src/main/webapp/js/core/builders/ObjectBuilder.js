/*
 * ObjectBuilder.js
 *
 * @author realor
 */

import { Solid } from "../Solid.js";
import * as THREE from "../../lib/three.module.js";

class ObjectBuilder
{
  static DEFAULT_INSTANCE = new ObjectBuilder();

  static BUILDERS = {};

  constructor()
  {
  }

  /*
   * Calls action(dep) for each object dependency
   *
   * Traverse children by default
   */
  traverseDependencies(object, action)
  {
    const children = object.children;
    for (let child of children)
    {
      action(child);
    }
  }

  /*
   * Builds object assuming its dependencies have already been built
   *
   * returns true if object has actually changed
   */
  performBuild(object)
  {
    return false;
  }

  /* static methods */

  static registerBuilder(builder)
  {
    this.BUILDERS[builder.name] = builder;
  }

  static mark(object)
  {
    if (object.needsMarking === false) return;

    object.needsMarking = false;

    let builder = object.builder || ObjectBuilder.DEFAULT_INSTANCE;
    builder.traverseDependencies(object, dep =>
    {
      ObjectBuilder.mark(dep);
      object.needsRebuild = object.needsRebuild || dep.needsRebuild;
    });
  }

  static build(object, built)
  {
    if (object.needsRebuild === false) return;

    object.needsRebuild = false;

    const builder = object.builder || ObjectBuilder.DEFAULT_INSTANCE;
    builder.traverseDependencies(object, dep =>
    {
      ObjectBuilder.build(dep, built);
    });

    if (builder.performBuild(object))
    {
      if (built) built.push(object);
    }
  }

  static markAndBuild(object, built)
  {
    object.needsMarking = true;
    object.traverse(child => child.needsMarking = true);

    ObjectBuilder.mark(object);
    ObjectBuilder.build(object, built);
  }
}

export { ObjectBuilder };

