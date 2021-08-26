/**
 * ObjectUtils.js
 *
 * @author: realor
 */

import * as THREE from "../lib/three.module.js";
import { Solid } from "../core/Solid.js";
import { SolidGeometry } from "../core/SolidGeometry.js";

class ObjectUtils
{
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

  static zoomAll(camera, objects, aspect, invisible)
  {
    if (objects instanceof THREE.Object3D)
    {
      objects = [objects];
    }

    let box = ObjectUtils.getBoundingBoxFromView(
      objects, camera.matrixWorld, invisible); // box in camera CS

    if (box.isEmpty()) return;

    let center = new THREE.Vector3();
    center = box.getCenter(center); // center in camera CS
    let matrix = camera.matrix;
    center.applyMatrix4(camera.matrix); // center in camera parent CS

    let boxWidth = box.max.x - box.min.x;
    let boxHeight = box.max.y - box.min.y;

    if (camera instanceof THREE.PerspectiveCamera)
    {
      let boxDepth = box.max.z - box.min.z;

      let ymax = camera.near * Math.tan(THREE.Math.degToRad(camera.fov * 0.5));
  		let xmax = ymax * camera.aspect;

      let yoffset = boxHeight * camera.near / (2 * ymax);
      let xoffset = boxWidth * camera.near / (2 * xmax);

      let offset = Math.max(xoffset, yoffset) + 0.5 * boxDepth;

      let v = new THREE.Vector3();
      v.x = matrix.elements[8];
      v.y = matrix.elements[9];
      v.z = matrix.elements[10];
      v.normalize(); // view vector (zaxis) in parent CS

      v.multiplyScalar(offset);
      center.add(v);
    }
    else // Ortho camera
    {
      camera.left = -0.5 * boxWidth;
      camera.right = 0.5 * boxWidth;
      camera.top = 0.5 * boxHeight;
      camera.bottom = -0.5 * boxHeight;
    }
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

  static getBoundingBoxFromView(objects, viewMatrixWorld, invisible)
  {
    const box = new THREE.Box3(); // empty box
    const vertex = new THREE.Vector3();
    const inverseMatrix = new THREE.Matrix4();
    inverseMatrix.copy(viewMatrixWorld).invert();

    for (let i = 0; i < objects.length; i++)
    {
      let object = objects[i];
      object.traverse(function(object)
      {
        if ((object.visible || invisible) &&
            (object instanceof THREE.Mesh ||
             object instanceof THREE.Line ||
             object instanceof THREE.Points))
        {
          var geometry = object.geometry;
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
            let positions = geometry.attributes.position.array;
            if (positions)
            {
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
      });
    }
    return box;
  }

  static getLocalBoundingBox(object, all)
  {
    var box = new THREE.Box3(); // empty box
    var objectBox = new THREE.Box3();

    var extendBox = function(object, box, toBaseMatrix)
    {
      if (object.visible || all)
      {
        if (object instanceof THREE.Mesh ||
            object instanceof THREE.Line ||
            object instanceof THREE.PointCloud)
        {
          if (object.geometry.boundingBox === null)
          {
            object.geometry.computeBoundingBox();
          }
          if (!object.geometry.boundingBox.isEmpty())
          {
            objectBox.copy(object.geometry.boundingBox);
            objectBox.applyMatrix4(toBaseMatrix);
            box.union(objectBox);
          }
        }
        else
        {
          var children = object.children;
          for (var i = 0; i < children.length; i++)
          {
            var child = children[i];
            var matrix = new THREE.Matrix4();
            matrix.copy(toBaseMatrix).multiply(child.matrix);
            extendBox(child, box, matrix);
          }
        }
      }
    };

    extendBox(object, box, new THREE.Matrix4());

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
}

export { ObjectUtils };