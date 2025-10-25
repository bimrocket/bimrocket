/*
 * ScaleTool.js
 *
 * @author realor
 */

import { TransformationTool } from "./TransformationTool.js";
import { Controls } from "../ui/Controls.js";
import { I18N } from "../i18n/I18N.js";
import { PointSelector } from "../utils/PointSelector.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import * as THREE from "three";

class ScaleTool extends TransformationTool
{
  static CHANGED_PROPERTIES = ["position", "rotation", "scale"];

  constructor(application, options)
  {
    super(application);
    this.name = "scale";
    this.label = "tool.scale.label";
    this.className = "scale";
    this.minScale = 0.001;
    this.snapFactor = 0.1;
    this.snapPercent = 0.3;
    this.setOptions(options);
    application.addTool(this);

    // internals
    this.firstPointWorld = new THREE.Vector3();
    this.anchorPointWorld = new THREE.Vector3();
    this.scale = 1;
    this.keepProportions = true;

    this.baseMatrixWorld = new THREE.Matrix4();
    this.baseMatrixWorldInverse = new THREE.Matrix4();
    this._vector1 = new THREE.Vector3();
    this._vector2 = new THREE.Vector3();

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left", "panel_scale");
    this.panel.preferredHeight = 180;

    this.panel.onClose = () => this.application.useTool(null);

    this.helpElem = document.createElement("div");
    this.panel.bodyElem.appendChild(this.helpElem);

    this.scaleInputElem = Controls.addNumberField(this.panel.bodyElem,
      "scale_factor", "label.scale_factor", 1);
    this.scaleInputElem.step = this.snapFactor;
    this.scaleInputElem.addEventListener("change", event =>
    {
      this.scale = this.scaleInputElem.value;
      this.lengthInputElem.value = this.scaleToLength(this.scale);
      this.scaleObjects();
    }, false);

    this.lengthInputElem = Controls.addNumberField(this.panel.bodyElem,
      "scale_length", "label.length", 0);
    this.lengthInputElem.step = this.snapFactor;
    this.lengthInputElem.addEventListener("change", event =>
    {
      this.scale = this.lengthToScale(this.lengthInputElem.value);
      this.scaleInputElem.value = this.scale;
      this.scaleObjects();
    }, false);

    this.keepPropCheckbox = Controls.addCheckBoxField(this.panel.bodyElem,
      "scale_keep_prop", "label.scale_keep_proportions", this.keepProportions);
    this.keepPropCheckbox.addEventListener("change", event =>
    {
      this.keepProportions = this.keepPropCheckbox.checked;
      this.scaleObjects();
    });

    this.buttonsPanel = document.createElement("div");
    this.panel.bodyElem.appendChild(this.buttonsPanel);

    this.acceptButton = Controls.addButton(this.buttonsPanel,
      "cancel_section", "button.accept", event =>
    {
      this.scale = this.scaleInputElem.value;
      this.scaleObjects();
      this.setStage(0);
    });

    this.cancelButton = Controls.addButton(this.buttonsPanel,
      "cancel_section", "button.cancel", event =>
    {
      this.scale = 1;
      this.scaleObjects();
      this.setStage(0);
    });
  }

  onPointerMove(event)
  {
    if (this.stage === 2)
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

        let destinationPoint = this._vector2;
        destinationPoint.copy(snap.positionWorld);
        destinationPoint.applyMatrix4(this.baseMatrixWorldInverse);

        let z1 = anchorPoint.z;
        let z2 = destinationPoint.z;

        let scale = z2 / z1;

        if (Math.abs(scale) > this.minScale)
        {
          let divisions = scale / this.snapFactor;
          let intDivisions = Math.round(divisions);
          let decimals = divisions - intDivisions;
          if (decimals >= -this.snapPercent && decimals <= this.snapPercent)
          {
            const k = 1000000;
            scale = Math.round(k * intDivisions * this.snapFactor) / k;
          }
          this.scale = scale;
          this.lengthInputElem.value = this.scaleToLength(scale);

          this.scaleObjects();

          this.scaleInputElem.value = this.scale;
        }
      }
    }
  }

  onPointerUp(event)
  {
    const application = this.application;

    if (!application.isCanvasEvent(event)) return;

    const pointSelector = application.pointSelector;

    const snap = pointSelector.snap;
    if (this.stage === 0) // origin point
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
    }
    else if (this.stage === 1 || this.stage === 3) // anchor point
    {
      this.objectMatrices.clear();

      if (snap)
      {
        if (!snap.positionWorld.equals(this.firstPointWorld))
        {
          this.anchorPointWorld.copy(snap.positionWorld);
          this.createBaseMatrix();
          this.axisMatrixWorld.copy(this.baseMatrixWorld);
          this.scaleInputElem.value = 0;
          this.setStage(2);
        }
      }
      else
      {
        this.setStage(0);
      }
    }
    else if (this.stage === 2) // destination point
    {
      this.setStage(3);
    }
  }

  setStage(stage)
  {
    this.stage = stage;

    const application = this.application;

    switch (stage)
    {
      case 0: // set origin
        this.scale = 1;
        application.pointSelector.clearAxisGuides();
        application.pointSelector.filter = PointSelector.VISIBLE_FILTER;
        application.pointSelector.auxiliaryPoints = [];
        application.pointSelector.activate();
        this.scaleInputElem.parentElement.style.display = "none";
        this.lengthInputElem.parentElement.style.display = "none";
        this.buttonsPanel.style.display = "none";
        I18N.set(this.helpElem, "textContent", "tool.scale.select_first_point");
        application.i18n.update(this.helpElem);
        application.repaint();
        break;

      case 1: // set anchor point
        application.pointSelector.setAxisGuides(this.axisMatrixWorld, true);
        application.pointSelector.filter = PointSelector.VISIBLE_FILTER;
        application.pointSelector.auxiliaryPoints = [];
        application.pointSelector.activate();
        this.scaleInputElem.parentElement.style.display = "none";
        this.lengthInputElem.parentElement.style.display = "none";
        this.buttonsPanel.style.display = "none";
        I18N.set(this.helpElem, "textContent", "tool.scale.select_anchor_point");
        application.i18n.update(this.helpElem);
        break;

      case 2: // set destination point
        application.pointSelector.setAxisGuides(this.axisMatrixWorld, true);
        application.pointSelector.filter = PointSelector.VISIBLE_UNSELECTED_FILTER;
        application.pointSelector.auxiliaryPoints = [];
        application.pointSelector.activate();
        this.scaleInputElem.parentElement.style.display = "";
        this.lengthInputElem.parentElement.style.display = "";
        this.scaleInputElem.disabled = true;
        this.lengthInputElem.disabled = true;
        this.scaleInputElem.value = 1;
        this.lengthInputElem.value = this.scaleToLength(1);
        this.buttonsPanel.style.display = "none";
        I18N.set(this.helpElem, "textContent", "tool.scale.select_destination_point");
        application.i18n.update(this.helpElem);
        break;

      case 3: // edit scale factor/distance
        application.pointSelector.setAxisGuides(this.axisMatrixWorld, true);
        application.pointSelector.filter = PointSelector.VISIBLE_FILTER;
        application.pointSelector.auxiliaryPoints = [];
        application.pointSelector.activate();
        this.scaleInputElem.parentElement.style.display = "";
        this.lengthInputElem.parentElement.style.display = "";
        this.scaleInputElem.disabled = false;
        this.lengthInputElem.disabled = false;
        this.buttonsPanel.style.display = "";
        I18N.set(this.helpElem, "textContent", "tool.scale.edit_scale");
        application.i18n.update(this.helpElem);
        break;
    }
  }

  createBaseMatrix()
  {
    const scaleAxisWorld = this._vector1;
    scaleAxisWorld.subVectors(this.anchorPointWorld, this.firstPointWorld);
    scaleAxisWorld.normalize();

    let yVector = GeometryUtils.orthogonalVector(scaleAxisWorld).normalize();
    let xVector = new THREE.Vector3();
    xVector.crossVectors(yVector, scaleAxisWorld);

    const baseMatrixWorld = this.baseMatrixWorld;
    baseMatrixWorld.makeBasis(xVector, yVector, scaleAxisWorld);
    baseMatrixWorld.setPosition(this.firstPointWorld);

    const baseMatrixWorldInverse = this.baseMatrixWorldInverse;
    baseMatrixWorldInverse.copy(baseMatrixWorld).invert();
  }

  scaleObjects()
  {
    const application = this.application;

    const baseMatrixWorld = this.baseMatrixWorld;
    const baseMatrixWorldInverse = this.baseMatrixWorldInverse;
    const scaleZ = this.scale;
    const scaleXY = this.keepProportions ? scaleZ : 1;
    const scaleMatrixWorld = this._matrix1.makeScale(scaleXY, scaleXY, scaleZ);

    scaleMatrixWorld.multiply(baseMatrixWorldInverse);
    scaleMatrixWorld.premultiply(baseMatrixWorld);

    this.transformObjects(scaleMatrixWorld, ScaleTool.CHANGED_PROPERTIES);
  }

  resetTool()
  {
    super.resetTool();
    this.scale = 1;
  }

  lengthToScale(length)
  {
    let anchorPoint = this._vector1;
    anchorPoint.copy(this.anchorPointWorld);
    anchorPoint.applyMatrix4(this.baseMatrixWorldInverse);

    let z1 = anchorPoint.z;
    return length / z1;
  }

  scaleToLength(scale)
  {
    let anchorPoint = this._vector1;
    anchorPoint.copy(this.anchorPointWorld);
    anchorPoint.applyMatrix4(this.baseMatrixWorldInverse);

    let z1 = anchorPoint.z;
    return scale * z1;
  }
}

export { ScaleTool };
