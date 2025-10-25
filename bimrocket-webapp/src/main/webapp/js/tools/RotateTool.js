/*
 * RotateTool.js
 *
 * @author realor
 */

import { TransformationTool } from "./TransformationTool.js";
import { Controls } from "../ui/Controls.js";
import { I18N } from "../i18n/I18N.js";
import { PointSelector } from "../utils/PointSelector.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import * as THREE from "three";

class RotateTool extends TransformationTool
{
  static CHANGED_PROPERTIES = ["position", "rotation"];

  constructor(application, options)
  {
    super(application);
    this.name = "rotate";
    this.label = "tool.rotate.label";
    this.className = "rotate";
    this.setOptions(options);
    application.addTool(this);

    // internals
    this.firstPointWorld = new THREE.Vector3();
    this.secondPointWorld = new THREE.Vector3();
    this.anchorPointWorld = new THREE.Vector3();
    this.rotation = 0;

    this.baseMatrixWorld = new THREE.Matrix4();
    this.baseMatrixWorldInverse = new THREE.Matrix4();
    this._vector1 = new THREE.Vector3();
    this._vector2 = new THREE.Vector3();

    this.wheelPoints = [];
    this.wheel = this.createWheel();

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left", "panel_rotate");
    this.panel.preferredHeight = 140;

    this.panel.onClose = () => this.application.useTool(null);

    this.helpElem = document.createElement("div");
    this.panel.bodyElem.appendChild(this.helpElem);

    this.rotationInputElem = Controls.addNumberField(this.panel.bodyElem,
      "rotate_angle", "label.rotation", 0);
    this.rotationInputElem.step = 1;
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

  onPointerMove(event)
  {
    if (this.stage === 3)
    {
      const application = this.application;

      if (!application.isCanvasEvent(event)) return;

      const pointSelector = application.pointSelector;

      event.preventDefault();

      const snap = pointSelector.snap;
      if (snap)
      {
        let anchorPoint = this._vector1;
        anchorPoint.copy(this.anchorPointWorld);
        anchorPoint.applyMatrix4(this.baseMatrixWorldInverse);
        anchorPoint.z = 0;

        let destinationPoint = this._vector2;
        destinationPoint.copy(snap.positionWorld);
        destinationPoint.applyMatrix4(this.baseMatrixWorldInverse);
        destinationPoint.z = 0;

        let angleRad1 = Math.atan2(anchorPoint.y, anchorPoint.x);
        let angleRad2 = Math.atan2(destinationPoint.y, destinationPoint.x);

        let angleRad = angleRad2 - angleRad1;
        let angleDeg = THREE.MathUtils.radToDeg(angleRad);
        const k = 100000;
        angleDeg = Math.round(k * angleDeg) / k;
        if (angleDeg > 180) angleDeg -= 360;
        else if (angleDeg < -180) angleDeg += 360;

        this.rotation = angleDeg;
        this.rotateObjects();

        this.rotationInputElem.value = this.rotation;
      }
    }
  }

  onPointerUp(event)
  {
    const application = this.application;

    if (!application.isCanvasEvent(event)) return;

    const pointSelector = application.pointSelector;

    const snap = pointSelector.snap;
    if (this.stage === 0) // first axis point
    {
      if (snap)
      {
        this.firstPointWorld.copy(snap.positionWorld);

        if (snap.object)
        {
          let axisMatrixWorld = this.axisMatrixWorld;
          if (snap.object)
          {
            axisMatrixWorld.copy(snap.object.matrixWorld);
          }
          else
          {
            axisMatrixWorld.identity();
          }
          axisMatrixWorld.setPosition(this.firstPointWorld);
          if (application.selection.isEmpty())
          {
            application.selection.set(snap.object);
          }
        }
        this.setStage(1);
      }
      else
      {
        this.setStage(0);
      }
      application.overlays.remove(this.wheel);
    }
    else if (this.stage === 1) // second axis point
    {
      if (snap)
      {
        if (!snap.positionWorld.equals(this.firstPointWorld))
        {
          this.secondPointWorld.copy(snap.positionWorld);
          this.createBaseMatrix();
          this.rotationInputElem.value = 0;
          this.setStage(2);
        }
      }
      else
      {
        this.setStage(0);
      }
    }
    else if (this.stage === 2 || this.stage === 4) // anchor point
    {
      this.objectMatrices.clear();

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
    else if (this.stage === 3) // destination point
    {
      this.setStage(4);
    }
  }

  setStage(stage)
  {
    this.stage = stage;

    const application = this.application;

    switch (stage)
    {
      case 0: // set first point of rotation axis
        this.rotation = 0;
        application.pointSelector.clearAxisGuides();
        application.pointSelector.filter = PointSelector.VISIBLE_FILTER;
        application.pointSelector.auxiliaryPoints = [];
        application.pointSelector.activate();
        this.rotationInputElem.parentElement.style.display = "none";
        this.buttonsPanel.style.display = "none";
        I18N.set(this.helpElem, "textContent", "tool.rotate.select_first_point");
        application.i18n.update(this.helpElem);
        application.overlays.remove(this.wheel);
        application.repaint();
        break;

      case 1: // set second point of rotation axis
        application.pointSelector.setAxisGuides(this.axisMatrixWorld, true);
        application.pointSelector.filter = PointSelector.VISIBLE_FILTER;
        application.pointSelector.auxiliaryPoints = [];
        application.pointSelector.activate();
        this.rotationInputElem.parentElement.style.display = "none";
        this.buttonsPanel.style.display = "none";
        I18N.set(this.helpElem, "textContent", "tool.rotate.select_second_point");
        application.i18n.update(this.helpElem);
        break;

      case 2: // set anchor point
        application.pointSelector.clearAxisGuides();
        application.pointSelector.filter = PointSelector.VISIBLE_FILTER;
        application.pointSelector.auxiliaryPoints = this.wheelPoints;
        application.pointSelector.activate();
        this.rotationInputElem.parentElement.style.display = "none";
        this.buttonsPanel.style.display = "none";
        I18N.set(this.helpElem, "textContent", "tool.rotate.select_anchor_point");
        application.i18n.update(this.helpElem);
        break;

      case 3: // set destination point
        application.pointSelector.clearAxisGuides();
        application.pointSelector.filter = PointSelector.VISIBLE_UNSELECTED_FILTER;
        application.pointSelector.auxiliaryPoints = this.wheelPoints;
        application.pointSelector.activate();
        this.rotationInputElem.parentElement.style.display = "";
        this.rotationInputElem.disabled = true;
        this.buttonsPanel.style.display = "none";
        I18N.set(this.helpElem, "textContent", "tool.rotate.select_destination_point");
        application.i18n.update(this.helpElem);
        break;

      case 4: // edit rotation angle
        application.pointSelector.clearAxisGuides();
        application.pointSelector.filter = PointSelector.VISIBLE_FILTER;
        application.pointSelector.auxiliaryPoints = this.wheelPoints;
        application.pointSelector.activate();
        this.rotationInputElem.parentElement.style.display = "";
        this.rotationInputElem.disabled = false;
        this.buttonsPanel.style.display = "";
        I18N.set(this.helpElem, "textContent", "tool.rotate.edit_rotation");
        application.i18n.update(this.helpElem);
        break;
    }
  }

  createBaseMatrix()
  {
    const rotationAxisWorld = this._vector1;
    rotationAxisWorld.subVectors(this.secondPointWorld, this.firstPointWorld);
    rotationAxisWorld.normalize();

    let yVector = GeometryUtils.orthogonalVector(rotationAxisWorld).normalize();
    let xVector = new THREE.Vector3();
    xVector.crossVectors(yVector, rotationAxisWorld);

    const baseMatrixWorld = this.baseMatrixWorld;
    baseMatrixWorld.makeBasis(xVector, yVector, rotationAxisWorld);
    baseMatrixWorld.setPosition(this.firstPointWorld);

    const baseMatrixWorldInverse = this.baseMatrixWorldInverse;
    baseMatrixWorldInverse.copy(baseMatrixWorld).invert();

    const wheel = this.wheel;
    baseMatrixWorld.decompose(wheel.position, wheel.quaternion, wheel.scale);
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
      this.wheelPoints[i].set(x, y, 0).applyMatrix4(baseMatrixWorld);
    }
  }

  rotateObjects()
  {
    const application = this.application;

    const baseMatrixWorld = this.baseMatrixWorld;
    const baseMatrixWorldInverse = this.baseMatrixWorldInverse;
    const angleRad = THREE.MathUtils.degToRad(this.rotation);
    const rotationMatrixWorld = this._matrix1.makeRotationZ(angleRad);

    rotationMatrixWorld.multiply(baseMatrixWorldInverse);
    rotationMatrixWorld.premultiply(baseMatrixWorld);

    this.transformObjects(rotationMatrixWorld, RotateTool.CHANGED_PROPERTIES);
  }

  resetTool()
  {
    super.resetTool();
    this.rotation = 0;

    const application = this.application;
    application.overlays.remove(this.wheel);
    application.repaint();
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
        linewidth: 1,
        transparent: true,
        opacity: 0.8,
        depthTest: false }));
    lines.name = "RotationWheel";
    lines.raycast = function() {};
    lines.renderOrder = 10000;

    return lines;
  }
}

export { RotateTool };
