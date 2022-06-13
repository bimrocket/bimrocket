/**
 * Snap.js
 *
 * @author realor
 */

import { Application } from "../ui/Application.js";
import { GeometryUtils } from "./GeometryUtils.js";
import { ObjectUtils } from "./ObjectUtils.js";
import { Solid } from "../core/Solid.js";
import { I18N } from "../i18n/I18N.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import * as THREE from "../lib/three.module.js";

class PointSelector
{
  static VERTEX_SNAP = 0;
  static INTERSECTION_SNAP = 1;
  static EDGE_SNAP = 2;
  static GUIDE_SNAP = 3;
  static FACE_SNAP = 4;

  constructor(application)
  {
    this.application = application;

    this.activated = false;

    this.snapDistance = 16;
    this.snapSize = 8;

    this.snapColors = ["black", "purple", "blue", "orange", "red"];

    this.snap = null;

    this.auxiliaryPoints = []; // array of global Vector3

    this.auxiliaryLines = []; // array of global Line3

    this.touchPointerOffsetX = -40;
    this.touchPointerOffsetY = -40;

    this.axisGuides =
    [
      {
        label: "label.on_x_axis",
        startPoint: new THREE.Vector3(),
        endPoint: new THREE.Vector3(),
        startLocal : new THREE.Vector3(-1, 0, 0),
        endLocal : new THREE.Vector3(1, 0, 0),
        material : new THREE.LineDashedMaterial(
         { color: new THREE.Color(1, 0, 0),
           transparent: true,
           opacity : 0.4
         })
      },
      {
        label: "label.on_y_axis",
        startPoint: new THREE.Vector3(),
        endPoint: new THREE.Vector3(),
        startLocal : new THREE.Vector3(0, -1, 0),
        endLocal : new THREE.Vector3(0, 1, 0),
        material : new THREE.LineBasicMaterial(
         { color: new THREE.Color(0, 1, 0),
           transparent: true,
           opacity : 0.4
         })
      },
      {
        label: "label.on_z_axis",
        startPoint: new THREE.Vector3(),
        endPoint: new THREE.Vector3(),
        startLocal : new THREE.Vector3(0, 0, -1),
        endLocal : new THREE.Vector3(0, 0, 1),
        material : new THREE.LineBasicMaterial(
         { color: new THREE.Color(0, 0, 1),
           transparent: true,
           opacity : 0.4
         })
      }
    ];

    this.axisGuidesEnabled = false;

    this.snapElem = document.createElement("div");
    const snapElem = this.snapElem;
    snapElem.style.position = "absolute";
    snapElem.style.display = "none";
    snapElem.style.width = this.snapSize + "px";
    snapElem.style.height = this.snapSize + "px";
    application.container.appendChild(snapElem);

    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
  }

  activate()
  {
    if (!this.activated)
    {
      const application = this.application;
      const container = application.container;
      container.addEventListener('pointermove', this._onPointerMove, false);
      container.addEventListener('pointerup', this._onPointerUp, false);
      this.activated = true;
    }
  }

  deactivate()
  {
    if (this.activated)
    {
      const application = this.application;
      const container = application.container;
      container.removeEventListener('pointermove', this._onPointerMove, false);
      container.removeEventListener('pointerup', this._onPointerUp, false);
      this.snapElem.style.display = "none";
      this.activated = false;
    }
  }

  onPointerUp(event)
  {
    if (!this.isPointSelectionEvent(event)) return;
    if (event.pointerType === "touch")
    {
      this.snapElem.style.display = "none";
    }
  }

  onPointerMove(event)
  {
    if (!this.isPointSelectionEvent(event)) return;

    const application = this.application;
    const container = application.container;
    const snapElem = this.snapElem;

    let rect = container.getBoundingClientRect();
    const pointerPosition = new THREE.Vector2();
    pointerPosition.x = event.clientX - rect.left;
    pointerPosition.y = event.clientY - rect.top;

    if (event.pointerType === "touch")
    {
      pointerPosition.x += this.touchPointerOffsetX;
      pointerPosition.y += this.touchPointerOffsetY;
    }

    let snap = this.findSnap(pointerPosition);

    if (snap)
    {
      snapElem.style.left = (snap.positionScreen.x - this.snapSize / 2) + "px";
      snapElem.style.top = (snap.positionScreen.y - this.snapSize / 2) + "px";
      snapElem.style.display = "";
      snapElem.style.border = "1px solid white";
      snapElem.style.borderRadius = "0";
      snapElem.style.backgroundColor = this.snapColors[snap.type];
      I18N.set(snapElem, "title", snap.label);
      application.i18n.update(snapElem);

      this.snap = snap;
    }
    else
    {
      if (event.pointerType === "touch")
      {
        snapElem.style.left = (pointerPosition.x - this.snapSize / 2) + "px";
        snapElem.style.top = (pointerPosition.y - this.snapSize / 2) + "px";
        snapElem.style.display = "";
        snapElem.style.border = "1px solid black";
        snapElem.style.borderRadius = this.snapSize + "px";
        snapElem.style.backgroundColor = "transparent";
        snapElem.title = "";
      }
      else
      {
        snapElem.style.display = "none";
      }
      this.snap = null;
    }
  }

  setAxisGuides(axisMatrixWorld, visible = false)
  {
    const scale = axisMatrixWorld.getMaxScaleOnAxis();
    const factor = 1 / scale;

    let scaledAxisMatrixWorld = new THREE.Matrix4();
    scaledAxisMatrixWorld.makeScale(factor, factor, factor);
    scaledAxisMatrixWorld.premultiply(axisMatrixWorld);

    let k = 1000;

    for (let guide of this.axisGuides)
    {
      guide.startPoint.copy(guide.startLocal)
        .multiplyScalar(k).applyMatrix4(scaledAxisMatrixWorld);
      guide.endPoint.copy(guide.endLocal)
        .multiplyScalar(k).applyMatrix4(scaledAxisMatrixWorld);
    }
    this.axisGuidesEnabled = true;

    if (this.axisGroup)
    {
      this.application.removeObject(this.axisGroup);
      this.axisGroup = null;
    }

    if (visible)
    {
      this.axisGroup = new THREE.Group();
      this.axisGroup.name = "Axis guides";

      for (let guide of this.axisGuides)
      {
        let geometryPoints = [];
        geometryPoints.push(guide.startPoint);
        geometryPoints.push(guide.endPoint);

        let geometry = new THREE.BufferGeometry();
        geometry.setFromPoints(geometryPoints);

        let line = new THREE.Line(geometry, guide.material);
        line.name = guide.label;
        line.raycast = function(){};

        this.axisGroup.add(line);
      }
      this.application.addObject(this.axisGroup, this.application.overlays);
    }
  }

  clearAxisGuides()
  {
    if (this.axisGroup)
    {
      this.application.removeObject(this.axisGroup);
      this.axisGroup = null;
    }
    this.axisGuidesEnabled = false;
  }

  findSnap(pointerPosition)
  {
    const camera = this.application.camera;
    const container = this.application.container;
    const clientWidth = container.clientWidth;
    const clientHeight = container.clientHeight;
    const baseObject = this.application.baseObject;

    const raycaster = new THREE.Raycaster();
    const positionWorld = new THREE.Vector3();
    const positionScreen = new THREE.Vector2();
    const triangleWorld =
      [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    const vector = new THREE.Vector3();
    const point1 = new THREE.Vector3();
    const point2 = new THREE.Vector3();
    const sphere = new THREE.Sphere();

    const snapKeySet = new Set();
    let snaps = [];

    let pointercc = new THREE.Vector2();
    pointercc.x = (pointerPosition.x / container.clientWidth) * 2 - 1;
    pointercc.y = -(pointerPosition.y / container.clientHeight) * 2 + 1;

    raycaster.setFromCamera(pointercc, camera);
    raycaster.far = Math.Infinity;
    raycaster.camera = camera;

    const worldToScreen = (positionWorld, screenPosition) =>
    {
      vector.copy(positionWorld).project(camera);
      screenPosition.x = 0.5 * clientWidth * (vector.x + 1);
      screenPosition.y = 0.5 * clientHeight * (1 - vector.y);
    };

    const rayIntersectsObject = object =>
    {
      const geometry = object.geometry;
      const matrixWorld = object.matrixWorld;

      if (geometry === undefined) return false;

      if (geometry.boundingSphere === null) geometry.computeBoundingSphere();

      sphere.copy(geometry.boundingSphere);
      sphere.radius *= 1.2;
      sphere.applyMatrix4(matrixWorld);

      return raycaster.ray.intersectsSphere(sphere);
    };

    const isNewSnap = (type, snapPositionWorld) =>
    {
      const k = 10000;
      const snapKey = type + ":" +
        (Math.round(snapPositionWorld.x * k) / k) + "," +
        (Math.round(snapPositionWorld.y * k) / k) + "," +
        (Math.round(snapPositionWorld.z * k) / k);

      if (snapKeySet.has(snapKey))
      {
        return false;
      }
      else
      {
        snapKeySet.add(snapKey);
        return true;
      }
    };

    const addVertexSnap = (object, vertex, label, type) =>
    {
      positionWorld.copy(vertex);
      if (object)
      {
        positionWorld.applyMatrix4(object.matrixWorld);
      }
      worldToScreen(positionWorld, positionScreen);

      let distanceScreen = positionScreen.distanceTo(pointerPosition);
      if (distanceScreen < this.snapDistance)
      {
        if (isNewSnap(type, positionWorld))
        {
          snaps.push({
            label : label,
            type : type,
            object : object,
            positionScreen : positionScreen.clone(),
            distanceScreen : distanceScreen,
            positionWorld : positionWorld.clone(),
            distanceWorld : positionWorld.distanceTo(camera.position)
          });
        }
        return true;
      }
      return false;
    };

    const addEdgeSnap = (object, vertex1, vertex2, label, type) =>
    {
      point1.copy(vertex1);
      point2.copy(vertex2);

      if (object)
      {
        const matrixWorld = object.matrixWorld;
        point1.applyMatrix4(matrixWorld);
        point2.applyMatrix4(matrixWorld);
      }

      const ds = raycaster.ray.distanceSqToSegment(point1, point2,
          null, positionWorld);
      if (ds < 0.1)
      {
        worldToScreen(positionWorld, positionScreen);
        let distanceScreen = positionScreen.distanceTo(pointerPosition);
        if (distanceScreen < this.snapDistance)
        {
          if (isNewSnap(type, positionWorld))
          {
            snaps.push({
              label : label,
              type : type,
              object : object,
              positionScreen : positionScreen.clone(),
              distanceScreen : distanceScreen,
              positionWorld : positionWorld.clone(),
              distanceWorld : positionWorld.distanceTo(camera.position),
              line : new THREE.Line3(point1.clone(), point2.clone())
            });
          }
          return true;
        }
      }
      return false;
    };

    const addTriangleSnap = (object, face, vertex1, vertex2, vertex3,
      label, type) =>
    {
      triangleWorld[0].copy(vertex1);
      triangleWorld[1].copy(vertex2);
      triangleWorld[2].copy(vertex3);

      if (object)
      {
        for (let i = 0; i < 3; i++)
        {
          triangleWorld[i].applyMatrix4(object.matrixWorld);
        }
      }

      if (raycaster.ray.intersectTriangle(
          triangleWorld[0], triangleWorld[1], triangleWorld[2],
          false, positionWorld) !== null)
      {
        if (isNewSnap(type, positionWorld))
        {
          let plane = new THREE.Plane();
          plane.setFromCoplanarPoints(triangleWorld[0], triangleWorld[1],
            triangleWorld[2]);

          snaps.push({
            label : label,
            type : type,
            object : object,
            positionScreen : pointerPosition.clone(),
            distanceScreen : 0,
            positionWorld : positionWorld.clone(),
            distanceWorld : positionWorld.distanceTo(camera.position),
            face : face,
            triangle : [ triangleWorld[0].clone(),
              triangleWorld[1].clone(), triangleWorld[2].clone() ],
            plane : plane
          });
        }
        return true;
      }
      return false;
    };

    const addSolidVertexSnaps = (object) =>
    {
      const vertices = object.geometry.vertices;

      for (let vertex of vertices)
      {
        addVertexSnap(object, vertex, "label.on_vertex",
          PointSelector.VERTEX_SNAP);
      }
    };

    const addSolidEdgeSnaps = (object) =>
    {
      const matrixWorld = object.matrixWorld;
      const geometry = object.geometry;

      for (let face of geometry.faces)
      {
        addSolidLoopEdgeSnaps(object, face.outerLoop);
        for (let hole of face.holes)
        {
          addSolidLoopEdgeSnaps(object, hole);
        }
      }
    };

    const addSolidLoopEdgeSnaps = (object, loop) =>
    {
      const isManifold = object.geometry.isManifold;
      const vertices = object.geometry.vertices;
      const matrixWorld = object.matrixWorld;
      const size = loop.getVertexCount();

      for (let i = 0; i < size; i++)
      {
        let index1 = loop.indices[i];
        let index2 = loop.indices[(i + 1) % size];
        if (isManifold && index1 > index2) continue;

        let vertex1 = vertices[index1];
        let vertex2 = vertices[index2];

        addEdgeSnap(object, vertex1, vertex2, "label.on_edge",
          PointSelector.EDGE_SNAP);
      }
    };

    const addSolidFaceSnaps = (object) =>
    {
      const matrixWorld = object.matrixWorld;
      const geometry = object.geometry;
      const vertices = geometry.vertices;

      for (let face of geometry.faces)
      {
        for (let indices of face.getTriangles())
        {
          if (addTriangleSnap(object, face,
             vertices[indices[0]], vertices[indices[1]], vertices[indices[2]],
            "label.on_face", PointSelector.FACE_SNAP))
          {
            break;
          }
        }
      }
    };

    const addBufferGeometrySnaps = (object) =>
    {
      const matrixWorld = object.matrixWorld;
      const geometry = object.geometry;

      GeometryUtils.traverseBufferGeometryVertices(geometry, vertex =>
      {
        addVertexSnap(object, vertex, "label.on_vertex",
          PointSelector.VERTEX_SNAP);
      });
    };

    const addSceneSnaps = () =>
    {
      baseObject.traverseVisible(object =>
      {
        if (rayIntersectsObject(object))
        {
          if (object instanceof Solid && object.facesVisible)
          {
            addSolidVertexSnaps(object);
            addSolidEdgeSnaps(object);
            addSolidFaceSnaps(object);
          }
          else if (object.geometry instanceof THREE.BufferGeometry)
          {
            addBufferGeometrySnaps(object);
          }
        }
      });
    };

    const addAuxiliaryPointSnaps = () =>
    {
      for (let auxiliaryPoint of this.auxiliaryPoints)
      {
        addVertexSnap(null, auxiliaryPoint, "label.on_vertex",
          PointSelector.VERTEX_SNAP);
      }
    };

    const addAuxiliaryLineSnaps = () =>
    {
      for (let auxiliaryLine of this.auxiliaryLines)
      {
        addEdgeSnap(null, auxiliaryLine.start, auxiliaryLine.end,
          "label.on_edge", PointSelector.EDGE_SNAP);
      }
    };

    const addAxisGuideSnaps = () =>
    {
      if (this.axisGuidesEnabled)
      {
        for (let guide of this.axisGuides)
        {
          addEdgeSnap(null, guide.startPoint, guide.endPoint,
            guide.label, PointSelector.GUIDE_SNAP);
        }
      }
    };

    const filterHiddenSnaps = () =>
    {
      // find the first face snap (closest to observer)
      let firstFaceSnap = null;

      for (let snap of snaps)
      {
        if (snap.type === PointSelector.FACE_SNAP)
        {
          if (firstFaceSnap === null ||
              snap.distanceWorld < firstFaceSnap.distanceWorld)
          {
            firstFaceSnap = snap;
          }
        }
      }
      if (firstFaceSnap === null) return;

      // discard snaps behind the plane of the first face snap
      const visibleSnaps = [];

      let plane = firstFaceSnap.plane;
      for (let snap of snaps)
      {
        if (plane.distanceToPoint(snap.positionWorld) >= -0.0001)
        {
          visibleSnaps.push(snap);
        }
      }
      snaps = visibleSnaps;
    };

    const addIntersectionSnaps = () =>
    {
      const interSnaps = [];
      const ray = new THREE.Ray();

      for (let snap1 of snaps)
      {
        for (let snap2 of snaps)
        {
          if (snap1 !== snap2 &&
              (snap1.object !== snap2.object
              || snap1.object === null
              || snap2.object === null))
          {
            if ((snap1.type === PointSelector.EDGE_SNAP
                || snap1.type === PointSelector.GUIDE_SNAP)
                && snap2.type === PointSelector.FACE_SNAP)
            {
              // edge/guide - face intersection
              let edgeSnap = snap1;
              let faceSnap = snap2;
              let plane = faceSnap.plane;
              if (plane.intersectsLine(edgeSnap.line))
              {
                vector.subVectors(edgeSnap.line.end, edgeSnap.line.start);
                vector.normalize();
                ray.set(edgeSnap.line.start, vector);

                if (ray.intersectTriangle(
                  faceSnap.triangle[0],
                  faceSnap.triangle[1],
                  faceSnap.triangle[2],
                  false, positionWorld) !== null)
                {
                  worldToScreen(positionWorld, positionScreen);
                  let distanceScreen = positionScreen.distanceTo(pointerPosition);
                  if (distanceScreen < this.snapDistance)
                  {
                    let label = snap1.type === PointSelector.EDGE_SNAP ?
                      "label.on_edge_face" :
                      "label.on_guide_face";

                    interSnaps.push({
                      label :  label,
                      type : PointSelector.INTERSECTION_SNAP,
                      object : faceSnap.object || edgeSnap.object,
                      positionScreen : positionScreen.clone(),
                      distanceScreen : distanceScreen,
                      positionWorld : positionWorld.clone(),
                      distanceWorld : positionWorld.distanceTo(camera.position),
                      snap1 : snap1,
                      snap2 : snap2
                    });
                  }
                }
              }
            }
            else if ((snap1.type === PointSelector.EDGE_SNAP
                     || snap1.type === PointSelector.GUIDE_SNAP)
                     && snap2.type === PointSelector.EDGE_SNAP)
            {
              // guide - edge intersection

              let distance = GeometryUtils.intersectLines(
                snap1.line, snap2.line, point1, point2);

              if (distance >= 0 && distance < 0.0001)
              {
                positionWorld.copy(point1).add(point2).multiplyScalar(0.5);
                worldToScreen(positionWorld, positionScreen);
                let distanceScreen = positionScreen.distanceTo(pointerPosition);
                if (distanceScreen < this.snapDistance)
                {
                  let label = snap1.type === PointSelector.EDGE_SNAP ?
                    "label.on_edge_edge" :
                    "label.on_guide_edge";

                  interSnaps.push({
                    label : label,
                    type : PointSelector.INTERSECTION_SNAP,
                    object : snap1.object || snap2.object,
                    positionScreen : positionScreen.clone(),
                    distanceScreen : distanceScreen,
                    positionWorld : positionWorld.clone(),
                    distanceWorld : positionWorld.distanceTo(camera.position),
                    snap1 : snap1,
                    snap2 : snap2
                  });
                }
              }
            }
          }
        }
      }
      snaps.push(...interSnaps);
    };

    const selectRelevantSnap = () =>
    {
      let selectedSnap = snaps[0];
      for (let snap of snaps)
      {
        if (snap.type < selectedSnap.type ||
            (snap.type === selectedSnap.type &&
            snap.distanceScreen < selectedSnap.distanceScreen))
        {
          selectedSnap = snap;
        }
      }
      return selectedSnap;
    };

    addSceneSnaps();
    addAuxiliaryPointSnaps();
    addAuxiliaryLineSnaps();
    addAxisGuideSnaps();
    addIntersectionSnaps();
    filterHiddenSnaps();

    return selectRelevantSnap();
  }

  isPointSelectionEvent(event)
  {
    if (this.application.menuBar.armed) return false;

    const target = event.target || event.srcElement;
    const snapElem = this.snapElem;

    return target.nodeName.toLowerCase() === "canvas" || target === snapElem;
  }
}

export { PointSelector };
