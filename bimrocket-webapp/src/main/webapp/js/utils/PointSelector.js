/**
 * Snap.js
 *
 * @author realor
 */

import { Application } from "../ui/Application.js";
import { GeometryUtils } from "./GeometryUtils.js";
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

    this.snapDistance = 16;
    this.snapSize = 8;

    this.snapColors = ["black", "purple", "blue", "orange", "red"];

    this.snap = null;

    this.snapElem = document.createElement("div");
    const snapElem = this.snapElem;
    snapElem.style.position = "absolute";
    snapElem.style.display = "none";
    snapElem.style.width = this.snapSize + "px";
    snapElem.style.height = this.snapSize + "px";
    application.container.appendChild(snapElem);

    this._onPointerMove = this.onPointerMove.bind(this);

    const k = 1000;

    this.axisGuides =
    [
      {
        label: "label.on_x_axis",
        startPoint: new THREE.Vector3(),
        endPoint: new THREE.Vector3(),
        startLocal : new THREE.Vector3(-k, 0, 0),
        endLocal : new THREE.Vector3(k, 0, 0),
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
        startLocal : new THREE.Vector3(0, -k, 0),
        endLocal : new THREE.Vector3(0, k, 0),
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
        startLocal : new THREE.Vector3(0, 0, -k),
        endLocal : new THREE.Vector3(0, 0, k),
        material : new THREE.LineBasicMaterial(
         { color: new THREE.Color(0, 0, 1),
           transparent: true,
           opacity : 0.4
         })
      }
    ];

    this.axisGuidesEnabled = false;
  }

  activate()
  {
    const application = this.application;
    const container = application.container;
    container.addEventListener('pointermove', this._onPointerMove, false);
  }

  deactivate()
  {
    const application = this.application;
    const container = application.container;
    container.removeEventListener('pointermove', this._onPointerMove, false);
    this.snapElem.style.display = "none";
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

    let snap = this.findSnap(pointerPosition);

    if (snap)
    {
      snapElem.style.left = (snap.positionScreen.x - this.snapSize / 2) + "px";
      snapElem.style.top = (snap.positionScreen.y - this.snapSize / 2) + "px";
      snapElem.style.display = "";
      snapElem.style.border = "1px solid white";
      snapElem.style.backgroundColor = this.snapColors[snap.type];
      I18N.set(snapElem, "title", snap.label);
      application.i18n.update(snapElem);

      this.snap = snap;
    }
    else
    {
      snapElem.style.display = "none";
      this.snap = null;
    }
  }

  setAxisGuides(axisMatrixWorld, visible = false)
  {
    for (let guide of this.axisGuides)
    {
      guide.startPoint.copy(guide.startLocal).applyMatrix4(axisMatrixWorld);
      guide.endPoint.copy(guide.endLocal).applyMatrix4(axisMatrixWorld);
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

    const findVertexSnaps = (object, snaps) =>
    {
      const matrixWorld = object.matrixWorld;
      const geometry = object.geometry;

      for (let vertex of geometry.vertices)
      {
        positionWorld.copy(vertex).applyMatrix4(matrixWorld);
        worldToScreen(positionWorld, positionScreen);

        let distanceScreen = positionScreen.distanceTo(pointerPosition);
        if (distanceScreen < this.snapDistance)
        {
          snaps.push({
            label : "label.on_vertex",
            type : PointSelector.VERTEX_SNAP,
            object : object,
            positionScreen : positionScreen.clone(),
            distanceScreen : distanceScreen,
            positionWorld : positionWorld.clone(),
            distanceWorld : positionWorld.distanceTo(camera.position)
          });
        }
      }
    };

    const findEdgeSnaps = (object, snaps) =>
    {
      const matrixWorld = object.matrixWorld;
      const geometry = object.geometry;

      for (let face of geometry.faces)
      {
        findLoopEdgeSnaps(object, face.outerLoop, snaps);
        for (let hole of face.holes)
        {
          findLoopEdgeSnaps(object, hole, snaps);
        }
      }
    };

    const findLoopEdgeSnaps = (object, loop, snaps) =>
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

        point1.copy(vertex1).applyMatrix4(matrixWorld);
        point2.copy(vertex2).applyMatrix4(matrixWorld);

        const ds = raycaster.ray.distanceSqToSegment(point1, point2,
          null, positionWorld);
        if (ds < 0.1)
        {
          worldToScreen(positionWorld, positionScreen);
          let distanceScreen = positionScreen.distanceTo(pointerPosition);
          if (distanceScreen < this.snapDistance)
          {
            snaps.push({
              label : "label.on_edge",
              type : PointSelector.EDGE_SNAP,
              object : object,
              positionScreen : positionScreen.clone(),
              distanceScreen : distanceScreen,
              positionWorld : positionWorld.clone(),
              distanceWorld : positionWorld.distanceTo(camera.position),
              line : new THREE.Line3(point1.clone(), point2.clone())
            });
          }
        }
      }
    };

    const findFaceSnaps = (object, snaps) =>
    {
      const matrixWorld = object.matrixWorld;
      const geometry = object.geometry;

      for (let face of geometry.faces)
      {
        if (rayIntersectFace(raycaster.ray, face, matrixWorld,
            triangleWorld, positionWorld))
        {
          let plane = new THREE.Plane();
          plane.setFromCoplanarPoints(triangleWorld[0], triangleWorld[1],
            triangleWorld[2]);

          snaps.push({
            label : "label.on_face",
            type : PointSelector.FACE_SNAP,
            object : object,
            positionScreen : pointerPosition.clone(),
            distanceScreen : 0,
            positionWorld : positionWorld.clone(),
            distanceWorld : positionWorld.distanceTo(camera.position),
            face : face,
            plane : plane
          });
        }
      }
    };

    const rayIntersectFace = (ray, face, matrixWorld,
      triangleWorld, positionWorld) =>
    {
      const vertices = face.geometry.vertices;
      for (let indices of face.getTriangles())
      {
        for (let i = 0; i < 3; i++)
        {
          let vertex = vertices[indices[i]];
          triangleWorld[i].copy(vertex).applyMatrix4(matrixWorld);
        }

        if (ray.intersectTriangle(
            triangleWorld[0], triangleWorld[1], triangleWorld[2],
            false, positionWorld) !== null)
        {
          return positionWorld;
        }
      }
      return null;
    };

    const findAxisGuideSnaps = () =>
    {
      let guideSnaps = [];
      if (this.axisGuidesEnabled)
      {
        for (let guide of this.axisGuides)
        {
          let startPoint = guide.startPoint;
          let endPoint = guide.endPoint;

          const ds = raycaster.ray.distanceSqToSegment(startPoint, endPoint,
            null, positionWorld);
          if (ds < 0.1)
          {
            worldToScreen(positionWorld, positionScreen);
            let distanceScreen = positionScreen.distanceTo(pointerPosition);
            if (distanceScreen < this.snapDistance)
            {
              guideSnaps.push({
                label : guide.label,
                type : PointSelector.GUIDE_SNAP,
                object : null,
                positionScreen : positionScreen.clone(),
                distanceScreen : distanceScreen,
                positionWorld : positionWorld.clone(),
                distanceWorld : positionWorld.distanceTo(camera.position),
                line : new THREE.Line3(startPoint.clone(), endPoint.clone())
              });
            }
          }
        }
      }
      return guideSnaps;
    };

    const filterHiddenSnaps = snaps =>
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
      if (firstFaceSnap === null) return snaps;

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
      return visibleSnaps;
    };

    const filterDuplicatedSnaps = snaps =>
    {
      const map = new Map();
      const k = 10000;
      for (let snap of snaps)
      {
        let key = snap.type + ":" +
        (Math.round(snap.positionWorld.x * k) / k) + "," +
        (Math.round(snap.positionWorld.y * k) / k) + "," +
        (Math.round(snap.positionWorld.z * k) / k);

        map.set(key, snap);
      }
      return Array.from(map.values());
    };

    const addIntersectionSnaps = snaps =>
    {
      const interSnaps = [];
      const ray = new THREE.Ray();

      for (let snap1 of snaps)
      {
        for (let snap2 of snaps)
        {
          if (snap1.object !== snap2.object)
          {
            if ((snap1.type === PointSelector.EDGE_SNAP
                || snap1.type === PointSelector.GUIDE_SNAP)
                && snap2.type === PointSelector.FACE_SNAP)
            {
              // edge/guide - face intersection
              let edgeSnap = snap1;
              let faceSnap = snap2;
              let plane = faceSnap.plane;
              let face = faceSnap.face;
              let matrixWorld = faceSnap.object.matrixWorld;

              if (plane.intersectsLine(edgeSnap.line))
              {
                vector.subVectors(edgeSnap.line.end, edgeSnap.line.start);
                vector.normalize();
                ray.set(edgeSnap.line.start, vector);

                if (rayIntersectFace(ray, face,
                    matrixWorld, triangleWorld, positionWorld))
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
      interSnaps.push(...snaps);
      return interSnaps;
    };

    const selectRelevantSnap = snaps =>
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

    const findSnaps = () =>
    {
      const snaps = [];

      baseObject.traverse(object =>
      {
        if (object.visible
          && object.facesVisible
          && object instanceof Solid
          && rayIntersectsObject(object))
        {
          findVertexSnaps(object, snaps);
          findEdgeSnaps(object, snaps);
          findFaceSnaps(object, snaps);
        }
      });
      return snaps;
    };

    let snaps = findSnaps();
    snaps.push(...findAxisGuideSnaps());
    snaps = filterDuplicatedSnaps(snaps);
    snaps = addIntersectionSnaps(snaps);
    snaps = filterHiddenSnaps(snaps);
    return selectRelevantSnap(snaps);
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
