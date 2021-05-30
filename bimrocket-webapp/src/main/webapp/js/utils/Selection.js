/*
 * Selection.js
 */
BIMROCKET.Selection = class
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

  get objects()
  {
    return Array.from(this._objects);
  }

  get object()
  {
    let objects = this._objects;
    return objects.size === 0 ? null : objects.values().next().value;
  }

  contains(object)
  {
    return this._objects.has(object);
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

    for (let i = 0; i < objects.length; i++)
    {
      let object = objects[i];
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
    this._reduce();
  }

  _notifyListeners()
  {
    let selectionEvent = {type : "changed", objects : this.objects};
    this.application.notifyEventListeners("selection", selectionEvent);
  }

  _reduce()
  {
    let objects = this._objects;
    if (objects.size > 1)
    {
      let toRemove = [];
      let iterator = objects.values();
      let item = iterator.next();
      while (!item.done)
      {
        let object = item.value;
        if (this._isContained(object))
        {
          toRemove.push(object);
        }
        item = iterator.next();
      }
      for (let i = 0; i < toRemove.length; i++)
      {
        this._objects.delete(toRemove[i]);
      }
    }
  }

  _isContained(object)
  {
    let contained = false;
    let parent = object.parent;
    while (parent && !contained)
    {
      contained = this._objects.has(parent);
      parent = parent.parent;
    }
    return contained;
  }
};
