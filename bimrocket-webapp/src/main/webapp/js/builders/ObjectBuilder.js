/*
 * ObjectBuilder.js
 *
 * @author realor
 */

import { Solid } from "../core/Solid.js";
import * as THREE from "../lib/three.module.js";

class ObjectBuilder
{
  static DEFAULT_INSTANCE = new ObjectBuilder();

  static classes = {}; // builder registry

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
   * @returns {Boolean} true if object has actually changed, false othwerwise.
   */
  performBuild(object)
  {
    return false;
  }

  /*
   * Tells whether this builder constructs the geometry of the object
   *
   * @returns {Boolean} true if this builder constructs the geometry,
   * false otherwise. By default, this method returns true.
   */
  isGeometryBuilder(object)
  {
    return true;
  }

  /*
   * Tells whether this builder constructs the children of the object
   *
   * @returns {Boolean} true if this builder constructs the children of
   * the object, false otherwise. By default, this method returns false.
   */
  isChildrenBuilder(object)
  {
    return false;
  }

  /*
   * Clones this builder
   *
   * @returns {ObjectBuilder} a clone of this builder
   */
  clone()
  {
    return new this.constructor().copy(this);
  }

  /*
   * Copies the parameters of the source builder to this builder
   *
   * @returns {ObjectBuilder} this builder
   */
  copy(source)
  {
    return this;
  }

  /* static methods */

  static addClass(builderClass)
  {
    this.classes[builderClass.name] = builderClass;
  }

  /* returns an array with the names of the builders of the given class */
  static getTypesOf(builderClass)
  {
    let types = [];
    for (let className in this.classes)
    {
      let cls = this.classes[className];
      if (cls.prototype instanceof builderClass || cls === builderClass)
      {
        types.push(className);
      }
    }
    return types;
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

