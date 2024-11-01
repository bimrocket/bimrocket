/**
 * Selection.js
 *
 * @author realor
 */

import { Application } from "../ui/Application.js";
import * as THREE from "three";

class Selection
{
  constructor(application, notify = false)
  {
    this.application = application;
    this._objects = new Set();
    this.notify = notify;
  }

  get iterator()
  {
    return this._objects.values();
  }

  get object()
  {
    // returns the first object in selection
    let objects = this._objects;
    return objects.size === 0 ? null : objects.values().next().value;
  }

  get objects()
  {
    return Array.from(this._objects);
  }

  get roots()
  {
    // returns the top selected objects
    let roots = [];
    let iterator = this._objects.values();
    let item = iterator.next();
    while (!item.done)
    {
      let object = item.value;
      if (this.isRoot(object))
      {
        roots.push(object);
      }
      item = iterator.next();
    }
    return roots;
  }

  contains(object)
  {
    return this._objects.has(object);
  }

  isRoot(object)
  {
    // is root if object is selected but no ancestor is selected
    let root = this._objects.has(object);
    let parent = object.parent;
    while (parent && root)
    {
      root = !this._objects.has(parent);
      parent = parent.parent;
    }
    return root;
  }

  isEmpty()
  {
    return this._objects.size === 0;
  }

  get size()
  {
    return this._objects.size;
  }

  set(...objects)
  {
    this._objects.clear();
    this._add(objects);
    if (this.notify) this._notifyListeners();
  }

  add(...objects)
  {
    this._add(objects);
    if (this.notify) this._notifyListeners();
  }

  remove(...objects)
  {
    let size = this._objects.size;

    for (let object of objects)
    {
      this._objects.delete(object);
    }

    if (size !== this._objects.size)
    {
      if (this.notify) this._notifyListeners();
    }
  }

  clear()
  {
    if (this._objects.size > 0)
    {
      this._objects.clear();
      if (this.notify) this._notifyListeners();
    }
  }

  _add(objects)
  {
    for (let i = 0; i < objects.length; i++)
    {
      let object = objects[i];
      if (object instanceof THREE.Object3D)
      {
        this._objects.add(object);
      }
    }
  }

  _notifyListeners()
  {
    let selectionEvent = { type : "changed", objects : this.objects };
    this.application.notifyEventListeners("selection", selectionEvent);
  }
}

export { Selection };
