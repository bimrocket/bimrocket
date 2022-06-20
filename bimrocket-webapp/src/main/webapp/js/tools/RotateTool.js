/*
 * RotateTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Controls } from "../ui/Controls.js";
import { I18N } from "../i18n/I18N.js";
import { PointSelector } from "../utils/PointSelector.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import * as THREE from "../lib/three.module.js";

class RotateTool extends Tool
{
  static CHANGED_PROPERTIES = ["position", "rotation"];

  constructor(application, options)
  {
    super(application);
    this.name = "rotate";
    this.label = "tool.rotate.label";
    this.className = "rotate";
    this.setOptions(options);

    // internals
    this.stage = 0;
    this.firstPointWorld = new THREE.Vector3();
    this.secondPointWorld = new THREE.Vector3();
    this.anchorPointWorld = new THREE.Vector3();
    this.rotation = 0;
    this.objectMatrices = new Map();

    this.rotationBaseMatrix = new THREE.Matrix4();
    this.rotationBaseMatrixInverse = new THREE.Matrix4();
    this._matrix1 = new THREE.Matrix4();
    this._matrix2 = new THREE.Matrix4();
    this._matrix3 = new THREE.Matrix4();
    this._vector1 = new THREE.Vector3();
    this._vector2 = new THREE.Vector3();

    this._onPointerUp = this.onPointerUp.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onContextMenu = this.onContextMenu.bind(this);

    application.addEventListener("scene", event =>
    {
      if (event.type === "structureChanged"
          && event.objects[0] instanceof THREE.Scene)
      {
        this.setStage(0);
      }
    });

    this.createPanel();

    this.wheelPoints = [];
    this.wheel = this.createWheel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left", "panel_rotate");
    this.panel.preferredHeight = 140;

    this.helpElem = document.createElement("div");
    this.panel.bodyElem.appendChild(this.helpElem);

    this.rotationInputElem = Controls.addNumberField(this.panel.bodyElem,
      "rotate_angle", "label.rotation", 0);
    this.rotationInputElem.step = this.snapDistance;
    this.rotationInputElem.addEventListener("change", event =>
    {
      this.rotation = this.rotationInputElem.value;
      this.rotateObjects();
    }, false);

    this.buttonsPanel = document.createElement("div");
    this.panel.bodyElem.appendChild(this.buttonsPanel);

    this.acceptButton = Controls.addButton(this.buttonsPanel,
      "cancel_section", "button.accept", event =>
    {
      this.rotation = this.rotationInputElem.value;
      this.rotateObjects();
      this.setStage(0);
    });

    this.cancelButton = Controls.addButton(this.buttonsPanel,
      "cancel_section", "button.cancel", event =>
    {
      this.rotation = 0;
      this.rotateObjects();
      this.setStage(0);
    });
  }

  activate()
  {
    this.panel.visible = true;
    const container = this.application.container;
    container.addEventListener('pointerup', this._onPointerUp, false);
    container.addEventListener('pointermove', this._onPointerMove, false);
    container.addEventListener('contextmenu', this._onContextMenu, false);
    this.setStage(this.stage);
  }

  deactivate()
  {
    this.panel.visible = false;
    const container = this.application.container;
    container.removeEventListener('pointerup', this._onPointerUp, false);
    container.removeEventListener('pointermove', this._onPointerMove, false);
    container.removeEventListener('contextmenu', this._onContextMenu, false);
    this.application.pointSelector.deactivate();
  }

  onPointerMove(event)
  {
    if (this.stage === 3)
    {
      const application = this.application;
      const pointSelector = application.pointSelector;
      if (!pointSelector.isPointSelectionEvent(event)) return;

      event.preventDefault();

      const snap = pointSelector.snap;
      if (snap)
      {
        let anchorPoint = this._vector1;
        anchorPoint.copy(this.anchorPointWorld);
        anchorPoint.applyMatrix4(this.rotationBaseMatrixInverse);
        anchorPoint.z = 0;

        let destinationPoint = this._vector2;
        destinationPoint.copy(snap.positionWorld);
        destinationPoint.applyMatrix4(this.rotationBaseMatrixInverse);
        destinationPoint.z = 0;

        let angleRad1 = Math.atan2(anchorPoint.y, anchorPoint.x);
        let angleRad2 = Math.atan2(destinationPoint.y, destinationPoint.x);

        let angleRad = angleRad2 - angleRad1;
        let angleDeg = THREE.MathUtils.radToDeg(angleRad);
        const k = 100000;
        angleDeg = Math.round(k * angleDeg) / k;
        this.rotation = angleDeg;
        this.rotateObjects();

        this.rotationInputElem.value = this.rotation;
      }
    }
  }

  onPointerUp(event)
  {
    const application = this.application;
    const pointSelector = application.pointSelector;
    if (!pointSelector.isPointSelectionEvent(event)) return;

    const snap = pointSelector.snap;
    if (this.stage === 0 || this.stage === 4)
    {
      if (snap)
      {
        this.objectMatrices.clear();
        this.firstPointWorld.copy(snap.positionWorld);

        if (snap.object)
        {
          let axisMatrixWorld = this._matrix1;
          if (snap.object)
          {
            axisMatrixWorld.copy(snap.object.matrixWorld);
          }
          else
          {
            axisMatrixWorld.identity();
          }
          axisMatrixWorld.setPosition(this.firstPointWorld);
          pointSelector.setAxisGuides(axisMatrixWorld, true);
        }
        this.setStage(1);
      }
      else
      {
        this.setStage(0);
      }
      application.overlays.remove(this.wheel);
    }
    else if (this.stage === 1)
    {
      if (snap)
      {
        if (!snap.positionWorld.equals(this.firstPointWorld))
        {
          this.secondPointWorld.copy(snap.positionWorld);
          this.createRotationBaseMatrix();
          this.rotationInputElem.value = 0;
          this.setStage(2);
        }
      }
      else
      {
        this.setStage(0);
      }
    }
    else if (this.stage === 2)
    {
      if (snap)
      {
        if (!snap.positionWorld.equals(this.firstPointWorld)
            && !snap.positionWorld.equals(this.secondPointWorld))
        {
          this.anchorPointWorld.copy(snap.positionWorld);
          this.rotationInputElem.value = 0;
          this.setStage(3);
        }
      }
      else
      {
        this.setStage(0);
      }
    }
    else if (this.stage === 3)
    {
      this.setStage(4);
    }
  }

  onContextMenu(event)
  {
    const pointSelector = this.application.pointSelector;
    if (!pointSelector.isPointSelectionEvent(event)) return;

    event.preventDefault();
  }

  setStage(stage)
  {
    this.stage = stage;

    const application = this.application;

    switch (stage)
    {
      case 0: // set first point of rotation axis
        this.rotation = 0;
        application.pointSelector.excludeSelection = false;
        application.pointSelector.clearAxisGuides();
        application.pointSelector.activate();
        this.rotationInputElem.parentElement.style.display = "none";
        this.buttonsPanel.style.display = "none";
        I18N.set(this.helpElem, "innerHTML", "tool.rotate.select_first_point");
        application.i18n.update(this.helpElem);
        application.overlays.remove(this.wheel);
        application.pointSelector.auxiliaryPoints = [];
        application.repaint();
        break;

      case 1: // set second point of rotation axis
        application.pointSelector.activate();
        this.rotationInputElem.parentElement.style.display = "none";
        this.buttonsPanel.style.display = "none";
        I18N.set(this.helpElem, "innerHTML", "tool.rotate.select_second_point");
        application.i18n.update(this.helpElem);
        break;

      case 2: // set anchor point
        application.pointSelector.clearAxisGuides();
        application.pointSelector.activate();
        this.rotationInputElem.parentElement.style.display = "none";
        this.buttonsPanel.style.display = "none";
        I18N.set(this.helpElem, "innerHTML", "tool.rotate.select_anchor_point");
        application.i18n.update(this.helpElem);
        break;

      case 3: // set destination point
        application.pointSelector.clearAxisGuides();
        application.pointSelector.excludeSelection = true;
        application.pointSelector.activate();
        this.rotationInputElem.parentElement.style.display = "";
        this.rotationInputElem.disabled = true;
        this.buttonsPanel.style.display = "none";
        I18N.set(this.helpElem, "innerHTML", "tool.rotate.select_destination_point");
        application.i18n.update(this.helpElem);
        break;

      case 4: // edit rotation angle
        application.pointSelector.clearAxisGuides();
        application.pointSelector.excludeSelection = false;
        application.pointSelector.activate();
        application.pointSelector.auxiliaryPoints = [];
        this.rotationInputElem.parentElement.style.display = "";
        this.rotationInputElem.disabled = false;
        this.buttonsPanel.style.display = "";
        I18N.set(this.helpElem, "innerHTML", "tool.rotate.edit_rotation");
        application.i18n.update(this.helpElem);
        break;
    }
  }

  createRotationBaseMatrix()
  {
    const rotationAxisWorld = this._vector1;
    rotationAxisWorld.subVectors(this.secondPointWorld, this.firstPointWorld);
    rotationAxisWorld.normalize();

    let yVector = GeometryUtils.orthogonalVector(rotationAxisWorld).normalize();
    let xVector = new THREE.Vector3();
    xVector.crossVectors(yVector, rotationAxisWorld);

    const rotationBaseMatrix = this.rotationBaseMatrix;
    rotationBaseMatrix.makeBasis(xVector, yVector, rotationAxisWorld);
    rotationBaseMatrix.setPosition(this.firstPointWorld);

    const rotationBaseMatrixInverse = this.rotationBaseMatrixInverse;
    rotationBaseMatrixInverse.copy(rotationBaseMatrix).invert();

    const wheel = this.wheel;
    rotationBaseMatrix.decompose(wheel.position, wheel.quaternion, wheel.scale);
    wheel.updateMatrix();

    const application = this.application;
    application.overlays.add(wheel);
    application.repaint();

    const divisions = 72;
    const angleIncr = 2 * Math.PI / divisions;
    for (let i = 0; i < divisions; i++)
    {
      let angle = i * angleIncr;
      let x = 0.5 * Math.cos(angle);
      let y = 0.5 * Math.sin(angle);
      this.wheelPoints[i].set(x, y, 0).applyMatrix4(rotationBaseMatrix);
    }
    application.pointSelector.auxiliaryPoints = this.wheelPoints;
  }

  rotateObjects()
  {
    const application = this.application;

    const rotationBaseMatrix = this.rotationBaseMatrix;
    const rotationBaseMatrixInverse = this.rotationBaseMatrixInverse;
    const angleRad = THREE.MathUtils.degToRad(this.rotation);
    const rotationMatrix = this._matrix1.makeRotationZ(angleRad);

    rotationMatrix.multiply(rotationBaseMatrixInverse);
    rotationMatrix.premultiply(rotationBaseMatrix);

    const roots = application.selection.roots;
    const localRotationMatrix = this._matrix2;
    const parentMatrixInverse = this._matrix3;
    for (let object of roots)
    {
      let objectMatrix = this.objectMatrices.get(object);
      if (objectMatrix === undefined)
      {
        objectMatrix = object.matrix.clone();
        this.objectMatrices.set(object, objectMatrix);
      }

      object.parent.updateMatrix();
      object.parent.updateMatrixWorld();

      localRotationMatrix.copy(object.parent.matrixWorld);
      localRotationMatrix.premultiply(rotationMatrix);
      parentMatrixInverse.copy(object.parent.matrixWorld).invert();
      localRotationMatrix.premultiply(parentMatrixInverse);
      localRotationMatrix.multiply(objectMatrix);
      localRotationMatrix.decompose(
        object.position, object.quaternion, object.scale);

      object.updateMatrix();
      object.updateMatrixWorld();
    }
    application.notifyObjectsChanged(roots, this, "nodeChanged",
      RotateTool.CHANGED_PROPERTIES);
  }

  createWheel()
  {
    const geometry = new THREE.BufferGeometry();
    const points = [];
    points.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
    points.push(new THREE.Vector3(-0.1, 0, 0), new THREE.Vector3(0.1, 0, 0));
    points.push(new THREE.Vector3(0, -0.1, 0), new THREE.Vector3(0, 0.1, 0));

    const divisions = 72;
    const angleIncr = 2 * Math.PI / divisions;
    const wheelPoints = this.wheelPoints;

    for (let i = 0; i < divisions; i++)
    {
      let angle = i * angleIncr;

      let x = 0.5 * Math.cos(angle);
      let y = 0.5 * Math.sin(angle);

      wheelPoints.push(new THREE.Vector3(x, y, 0));
    }

    for (let i = 0; i < divisions; i++)
    {
      let p1 = wheelPoints[i];
      let p2 = wheelPoints[(i + 1) % divisions];
      let p3 = new THREE.Vector3();

      let angle = i * angleIncr;

      let r;
      if (i % 18 === 0) r = 0.35;
      else if (i % 9 === 0) r = 0.4;
      else r = 0.45;

      p3.x = r * Math.cos(angle);
      p3.y = r * Math.sin(angle);

      points.push(p1, p2);
      points.push(p1, p3);
    }

    geometry.setFromPoints(points);
    const lines = new THREE.LineSegments(geometry,
      new THREE.LineBasicMaterial(
      { color : 0xff0000,
        linewidth: 2,
        transparent: true,
        opacity: 0.4,
        depthTest: false }));
    lines.name = "RotationWheel";
    lines.raycast = function() {};
    lines.renderOrder = 10000;

    return lines;
  }
}

export { RotateTool };