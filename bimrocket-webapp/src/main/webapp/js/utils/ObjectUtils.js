/**
 * ObjectUtils.js
 *
 * @author realor
 */

import { Cord } from "../core/Cord.js";
import { Profile } from "../core/Profile.js";
import { Solid } from "../core/Solid.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import * as THREE from "../lib/three.module.js";

class ObjectUtils
{
  static METER_CONVERSION_FACTORS =
  {
    "km" : 0.001,
    "m"  : 1,
    "cm" : 100,
    "mm" : 1000,
    "in" : 39.3701
  };

  static find(root, condition)
  {
    const selection = [];

    root.traverse(object => { if (condition(object)) selection.push(object); });

    return selection;
  }

  static dispose(root, geometries = true, materials = true)
  {
    root.traverse(function(object)
    {
      if (geometries && object.geometry)
      {
        var geometry = object.geometry;
        if (geometry.dispose)
        {
          geometry.dispose();
        }
      }

      if (materials && object.material)
      {
        var material = object.material;
        if (material.dispose)
        {
          material.dispose();
        }
      }
    });
  }

  static updateVisibility(objects, visible)
  {
    const set = new Set();

    if (objects instanceof THREE.Object3D)
    {
      objects = [objects];
    }

    function traverse(object)
    {
      object.visible = visible;
      set.add(object);

      if (!(object instanceof Solid))
      {
        const children = object.children;
        for (let i = 0; i < children.length; i++)
        {
          traverse(children[i]);
        }
      }
    }

    for (let i = 0; i < objects.length; i++)
    {
      let object = objects[i];

      traverse(object);

      if (visible && !set.has(object.parent))
      {
        // make ancestors visible
        object.traverseAncestors(ancestor =>
        { ancestor.visible = true; set.add(ancestor); });
      }
    }
    return set;
  }

  static updateStyle(objects, edgesVisible, facesVisible)
  {
    const set = new Set();

    if (objects instanceof THREE.Object3D)
    {
      objects = [objects];
    }

    function traverse(object)
    {
      if (object instanceof Solid)
      {
        object.edgesVisible = edgesVisible;
        object.facesVisible = facesVisible;
        set.add(object);
      }
      else
      {
        const children = object.children;
        for (let i = 0; i < children.length; i++)
        {
          traverse(children[i]);
        }
      }
    }

    for (let object of objects)
    {
      traverse(object);
    }
    return set;
  }

  static zoomAll(camera, objects, aspect, all)
  {
    if (objects instanceof THREE.Object3D)
    {
      objects = [objects];
    }

    let box = ObjectUtils.getBoundingBoxFromView(
      objects, camera.matrixWorld, all); // box in camera CS

    if (box.isEmpty()) return;

    let center = new THREE.Vector3();
    center = box.getCenter(center); // center in camera CS
    let matrix = camera.matrix;
    center.applyMatrix4(camera.matrix); // center in camera parent CS

    let boxWidth = box.max.x - box.min.x;
    let boxHeight = box.max.y - box.min.y;
    let boxDepth = box.max.z - box.min.z;

    let offset;
    if (camera instanceof THREE.PerspectiveCamera)
    {
      let ymax = camera.near * Math.tan(THREE.Math.degToRad(camera.fov * 0.5));
  		let xmax = ymax * camera.aspect;

      let yoffset = boxHeight * camera.near / (2 * ymax);
      let xoffset = boxWidth * camera.near / (2 * xmax);

      offset = Math.max(xoffset, yoffset) + 0.5 * boxDepth;
    }
    else // Ortho camera
    {
      let factor = 0.5 * 1.1; // 10% extra space
      camera.left = -factor * boxWidth;
      camera.right = factor * boxWidth;
      camera.top = factor * boxHeight;
      camera.bottom = -factor * boxHeight;

      offset = camera.far - boxDepth;
    }
    let v = new THREE.Vector3();
    v.setFromMatrixColumn(matrix, 2); // view vector (zaxis) in parent CS
    v.normalize();
    v.multiplyScalar(offset);
    center.add(v);

    camera.zoom = 1;
    camera.position.copy(center);
    camera.updateMatrix();
    this.updateCameraAspectRatio(camera, aspect);
  }

  static updateCameraAspectRatio(camera, aspect)
  {
    if (camera instanceof THREE.PerspectiveCamera)
    {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    else if (camera instanceof THREE.OrthographicCamera)
    {
      var width = camera.right - camera.left;
      var height = camera.top - camera.bottom;
      var currentAspect = width / height;
      if (aspect < currentAspect)
      {
        var h = 0.5 * (width / aspect - height);
        camera.top += h;
        camera.bottom -= h;
      }
      else
      {
        var w = 0.5 * (height * aspect - width);
        camera.left -= w;
        camera.right += w;
      }
      camera.updateProjectionMatrix();
    }
  }

  static getBoundingBoxFromView(objects, viewMatrixWorld, all = false)
  {
    const box = new THREE.Box3(); // empty box
    const vertex = new THREE.Vector3();
    const inverseMatrix = new THREE.Matrix4();
    inverseMatrix.copy(viewMatrixWorld).invert();

    function extendBox(object)
    {
      let geometry = object.geometry;

      if (geometry)
      {
        if (geometry instanceof SolidGeometry)
        {
          let vertices = geometry.vertices;
          for (let j = 0; j < vertices.length; j++)
          {
            vertex.copy(vertices[j]);
            vertex.applyMatrix4(object.matrixWorld); // world CS
            vertex.applyMatrix4(inverseMatrix); // view CS
            box.expandByPoint(vertex);
          }
        }
        else if (geometry instanceof THREE.BufferGeometry)
        {
          let position = geometry.attributes.position;
          if (position)
          {
            const positions = position.array;
            for (let j = 0; j < positions.length; j += 3)
            {
              vertex.set(positions[j], positions[j + 1], positions[j + 2]);
              vertex.applyMatrix4(object.matrixWorld); // world CS
              vertex.applyMatrix4(inverseMatrix); // view CS
              box.expandByPoint(vertex);
            }
          }
        }
      }
    };

    function traverse(object)
    {
      if (object.visible || all)
      {
        extendBox(object);

        if (!(object instanceof Solid
             || object instanceof Cord
             || object instanceof Profile))
        {
          for (let child of object.children)
          {
            traverse(child);
          }
        }
      }
    };

    for (let object of objects)
    {
      traverse(object);
    }
    return box;
  }

  static getLocalBoundingBox(object, all = false)
  {
    const box = new THREE.Box3(); // empty box
    const objectBox = new THREE.Box3();

    function extendBox(object, toBaseMatrix)
    {
      if (object.visible || all)
      {
        let geometry = object.geometry;

        if (geometry)
        {
          if (geometry.boundingBox === null)
          {
            geometry.computeBoundingBox();
          }
          if (!geometry.boundingBox.isEmpty())
          {
            objectBox.copy(geometry.boundingBox);
            objectBox.applyMatrix4(toBaseMatrix);
            box.union(objectBox);
          }
        }

        if (!(object instanceof Solid))
        {
          const children = object.children;
          for (let child of children)
          {
            const matrix = new THREE.Matrix4();
            matrix.copy(toBaseMatrix).multiply(child.matrix);
            extendBox(child, matrix);
          }
        }
      }
    };

    extendBox(object, new THREE.Matrix4());

    return box;
  }

  static getBoxGeometry(box)
  {
    var size = new THREE.Vector3();
    box.getSize(size);

    var points = [];

    var xmin = box.min.x;
    var ymin = box.min.y;
    var zmin = box.min.z;

    var xmax = box.max.x;
    var ymax = box.max.y;
    var zmax = box.max.z;

    var b0 = box.min;
    var b1 = new THREE.Vector3(xmax, ymin, zmin);
    var b2 = new THREE.Vector3(xmax, ymax, zmin);
    var b3 = new THREE.Vector3(xmin, ymax, zmin);

    var t0 = new THREE.Vector3(xmin, ymin, zmax);
    var t1 = new THREE.Vector3(xmax, ymin, zmax);
    var t2 = box.max;
    var t3 = new THREE.Vector3(xmin, ymax, zmax);

    points.push(b0);
    points.push(b1);
    points.push(b1);
    points.push(b2);
    points.push(b2);
    points.push(b3);
    points.push(b3);
    points.push(b0);

    points.push(t0);
    points.push(t1);
    points.push(t1);
    points.push(t2);
    points.push(t2);
    points.push(t3);
    points.push(t3);
    points.push(t0);

    points.push(b0);
    points.push(t0);
    points.push(b1);
    points.push(t1);
    points.push(b2);
    points.push(t2);
    points.push(b3);
    points.push(t3);

    return new THREE.BufferGeometry().setFromPoints(points);
  }

  static findCameras(object, array)
  {
    if (array === undefined) array = [];
    if (object instanceof THREE.Camera)
    {
      array.push(object);
    }
    var children = object.children;
    for (var i = 0; i < children.length; i++)
    {
      this.findCameras(children[i], array);
    }
    return array;
  }

  static findMaterials(object, array)
  {
    if (array === undefined) array = [];
    var materialMap = {};
    object.traverse(function(object)
    {
      var material = object.material;
      if (material)
      {
        if (materialMap[material.uuid] === undefined)
        {
          materialMap[material.uuid] = material;
          array.push(material);
        }
      }
    });
    return array;
  }

  static isObjectDescendantOf(object, parent)
  {
    object = object.parent;
    while (object !== null && object !== parent)
    {
      object = object.parent;
    }
    return object === parent;
  }

  static isExportable(object)
  {
    if (object.name && object.name.startsWith(THREE.Object3D.HIDDEN_PREFIX))
      return false; // hidden object

    const exportInfo = object.userData.export;
    if (exportInfo)
    {
      if (exportInfo.export === false) // marked as non exportable
      {
        return false;
      }
    }
    return true;
  }

  static isExportableChildren(object)
  {
    const exportInfo = object.userData.export;
    if (exportInfo)
    {
      if (exportInfo.exportChildren === false) // children non exportable
      {
        return false;
      }
    }
    return true;
  }

  static scaleModel(model, toUnits = "m", fromUnits)
  {
    fromUnits = fromUnits || model.userData.units;
    if (fromUnits)
    {
      let factor1 = this.METER_CONVERSION_FACTORS[toUnits];
      let factor2 = this.METER_CONVERSION_FACTORS[fromUnits];

      if (factor1 !== undefined && factor2 !== undefined)
      {
        let scale = factor1 / factor2;
        model.scale.set(scale, scale, scale);
        model.updateMatrix();
        return true;
      }
    }
    return false;
  }
};

export { ObjectUtils, };