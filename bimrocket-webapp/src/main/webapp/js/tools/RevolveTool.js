/*
 * RevolveTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Solid } from "../core/Solid.js";
import { Profile } from "../core/Profile.js";
import { ObjectBuilder } from "../builders/ObjectBuilder.js";
import { CircleBuilder } from "../builders/CircleBuilder.js";
import { Revolver } from "../builders/Revolver.js";
import { Controls } from "../ui/Controls.js";
import { PointSelector } from "../utils/PointSelector.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class RevolveTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "revolve";
    this.label = "tool.revolve.label";
    this.help = "tool.revolve.help";
    this.className = "revolve";
    this.angleStep = 1;
    this.setOptions(options);

    this.stage = 0;
    this.solid = null;
    this.startPoint = new THREE.Vector3();
    this.endPoint = new THREE.Vector3();
    this.angle = 0;

    this.axisMatrixWorld = new THREE.Matrix4();
    this.revolutionAxisMatrixWorld = new THREE.Matrix4();
    this.revolutionAxisMatrixWorldInverse = new THREE.Matrix4();
    this.solidMatrixWorldInverse = new THREE.Matrix4();

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onSelection = this.onSelection.bind(this);
    this._onContextMenu = this.onContextMenu.bind(this);

    this.extrudeMaterial = new THREE.LineBasicMaterial(
    {
      color : new THREE.Color(1, 0, 0),
      depthTest : false,
      linewidth: 1.5
    });

    this.wheelPoints = [];
    this.wheel = this.createWheel();

    this.createPanel();
  }

  activate()
  {
    this.panel.visible = true;
    const application = this.application;
    const container = application.container;
    container.addEventListener('contextmenu', this._onContextMenu, false);
    container.addEventListener('pointerdown', this._onPointerDown, false);
    container.addEventListener('pointerup', this._onPointerUp, false);
    container.addEventListener('pointermove', this._onPointerMove, false);
    application.addEventListener('selection', this._onSelection, false);
    this.prepareRevolution();
  }

  deactivate()
  {
    this.panel.visible = false;
    const application = this.application;
    const container = application.container;
    container.removeEventListener('contextmenu', this._onContextMenu, false);
    container.removeEventListener('pointerdown', this._onPointerDown, false);
    container.removeEventListener('pointerup', this._onPointerUp, false);
    container.removeEventListener('pointermove', this._onPointerMove, false);
    application.removeEventListener('selection', this._onSelection, false);
    application.pointSelector.deactivate();
    this.removeWheel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left", "panel_revolve");
    this.panel.preferredHeight = 140;

    this.helpElem = document.createElement("div");
    this.panel.bodyElem.appendChild(this.helpElem);

    this.angleInputElem = Controls.addNumberField(this.panel.bodyElem,
      "revolve_angle", "label.angle", 0);
    this.angleInputElem.step = this.angleStep;
    this.angleInputElem.addEventListener("change", event =>
    {
      this.angle = parseFloat(this.angleInputElem.value);
      this.updateRevolution();
    }, false);

    this.angleLabelElem = this.angleInputElem.parentElement.firstChild;

    this.buttonsElem = document.createElement("div");
    this.panel.bodyElem.appendChild(this.buttonsElem);

    this.applyButton = Controls.addButton(this.buttonsElem,
      "revolve_apply", "button.apply", event =>
    {
      this.angle = parseFloat(this.angleInputElem.value);
      this.updateRevolution();
    });

    this.changeAxisButton = Controls.addButton(this.buttonsElem,
      "revolve_changeAxis", "button.change_axis", event =>
    {
      this.angle = 0;
      this.updateRevolution();
      this.setStage(0);
    });

    this.finishButton = Controls.addButton(this.buttonsElem,
      "revolve_finish", "button.finish", event =>
    {
      this.application.selection.clear();
    });
  }

  onPointerDown(event)
  {
    const application = this.application;
    const pointSelector = application.pointSelector;
    if (!pointSelector.isPointSelectionEvent(event)) return;

    if (this.stage === 2)
    {
      this.setStage(3);
    }
  }

  onPointerMove(event)
  {
    const pointSelector = this.application.pointSelector;
    if (!pointSelector.isPointSelectionEvent(event)) return;

    let snap = pointSelector.snap;

    if (snap)
    {
      if (this.stage === 3)
      {
        this.updateAngle(snap.positionWorld);
      }
    }
  }

  onPointerUp(event)
  {
    const pointSelector = this.application.pointSelector;
    if (!pointSelector.isPointSelectionEvent(event)) return;

    const snap = pointSelector.snap;
    if (snap)
    {
      if (this.stage === 0)
      {
        this.solidMatrixWorldInverse.copy(this.solid.matrixWorld).invert();
        this.startPoint.copy(snap.positionWorld);
        this.startPoint.applyMatrix4(this.solidMatrixWorldInverse);
        this.startPoint.z = 0;

        if (snap.object)
        {
          this.axisMatrixWorld.copy(snap.object.matrixWorld);
        }
        else
        {
          this.axisMatrixWorld.identity();
        }
        this.axisMatrixWorld.setPosition(snap.positionWorld);
        this.setStage(1);
      }
      else if (this.stage === 1)
      {
        this.solidMatrixWorldInverse.copy(this.solid.matrixWorld).invert();
        this.endPoint.copy(snap.positionWorld);
        this.endPoint.applyMatrix4(this.solidMatrixWorldInverse);
        this.endPoint.z = 0;

        const builder = this.solid.builder;
        builder.location.copy(this.startPoint);
        let axis = new THREE.Vector3();
        axis.subVectors(this.endPoint, this.startPoint).normalize();
        if (this.isValidAxis(axis))
        {
          builder.axis.copy(axis);
          this.updateRevolution(true);
          this.setStage(2);
        }
        else
        {
          this.setStage(0);
          MessageDialog.create("ERROR", "message.invalid_revolution_axis")
            .setClassName("error")
            .setI18N(this.application.i18n).show();
        }
      }
      else if (this.stage === 3)
      {
        this.updateAngle(snap.positionWorld);
        this.setStage(2);
      }
    }
    else
    {
      if (this.stage === 3)
      {
        this.setStage(2);
      }
    }
  }

  onSelection(event)
  {
    this.prepareRevolution();
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
      case 0: // set revolve axis start point
        application.pointSelector.auxiliaryPoints = [];
        application.pointSelector.auxiliaryLines = [];
        application.pointSelector.filter = PointSelector.VISIBLE_FILTER;
        application.pointSelector.clearAxisGuides();
        application.pointSelector.activate();
        this.angleLabelElem.style.display = "none";
        this.angleInputElem.disabled = false;
        this.angleInputElem.style.display = "none";
        this.applyButton.style.display = "none";
        this.changeAxisButton.style.display = "none";
        this.finishButton.style.display = "";
        I18N.set(this.helpElem, "textContent", "tool.revolve.set_axis_first_point");
        application.i18n.update(this.helpElem);
        this.removeWheel();
        break;

      case 1: // set revolve axis end point
        application.pointSelector.auxiliaryPoints = [];
        application.pointSelector.auxiliaryLines = [];
        application.pointSelector.filter = PointSelector.VISIBLE_FILTER;
        application.pointSelector.setAxisGuides(this.axisMatrixWorld, true);
        application.pointSelector.activate();
        this.angleLabelElem.style.display = "none";
        this.angleInputElem.disabled = false;
        this.angleInputElem.style.display = "none";
        this.applyButton.style.display = "none";
        this.finishButton.style.display = "";
        this.changeAxisButton.style.display = "none";
        I18N.set(this.helpElem, "textContent", "tool.revolve.set_axis_second_point");
        application.i18n.update(this.helpElem);
        this.removeWheel();
        break;

      case 2: // dynamic revolve: pointer up
        application.pointSelector.clearAxisGuides();
        application.pointSelector.filter = PointSelector.VISIBLE_UNSELECTED_FILTER;
        application.pointSelector.auxiliaryPoints = this.wheelPoints;
        application.pointSelector.auxiliaryLines = [];
        application.pointSelector.activate();
        this.angleLabelElem.style.display = "";
        this.angleInputElem.disabled = false;
        this.angleInputElem.style.display = "";
        this.applyButton.style.display = "";
        this.finishButton.style.display = "";
        this.changeAxisButton.style.display = "";
        I18N.set(this.helpElem, "textContent", "tool.revolve.drag_pointer");
        application.i18n.update(this.helpElem);
        this.addWheel();
        break;

      case 3: // dynamic revolve: pointer down
        application.pointSelector.clearAxisGuides();
        application.pointSelector.filter = PointSelector.VISIBLE_UNSELECTED_FILTER;
        application.pointSelector.auxiliaryPoints = this.wheelPoints;
        application.pointSelector.auxiliaryLines = [];
        application.pointSelector.activate();
        this.angleLabelElem.style.display = "";
        this.angleInputElem.disabled = true;
        this.angleInputElem.style.display = "";
        this.applyButton.style.display = "none";
        this.changeAxisButton.style.display = "none";
        this.finishButton.style.display = "";
        I18N.set(this.helpElem, "textContent", "tool.revolve.drag_pointer");
        application.i18n.update(this.helpElem);
        this.addWheel();
        break;

      case 4: // no object selected
        application.pointSelector.auxiliaryPoints = [];
        application.pointSelector.auxiliaryLines = [];
        application.pointSelector.deactivate();
        this.angleLabelElem.style.display = "none";
        this.angleInputElem.style.display = "none";
        this.applyButton.style.display = "none";
        this.changeAxisButton.style.display = "none";
        this.finishButton.style.display = "none";
        I18N.set(this.helpElem, "textContent", "tool.revolve.select_object");
        application.i18n.update(this.helpElem);
        this.removeWheel();
        break;
    }
  }

  prepareRevolution()
  {
    const application = this.application;
    const object = application.selection.object;

    let solid;
    let firstRevolve = false;
    let solidChanged = false;

    if (object instanceof Profile && !(object.parent instanceof Solid))
    {
      solid = this.revolveProfile(object);
      firstRevolve = true;
    }
    else if (object instanceof Profile
               && object.parent instanceof Solid
               && object.parent.builder instanceof Revolver
               && object.parent.children.length === 3)
    {
      solid = object.parent;
    }
    else if (object instanceof Solid
             && object.builder instanceof Revolver
             && object.children.length === 3
             && object.children[2] instanceof Profile)
    {
      solid = object;
    }
    else
    {
      solid = null;
    }

    solidChanged = this.solid !== solid;
    this.solid = solid;

    if (solid)
    {
      this.angle = solid.builder.angle;
      this.updateAngleInPanel();
      if (firstRevolve)
      {
        this.setStage(0); // set revolve axis
      }
      else if (solidChanged)
      {
        this.setStage(2);
      }
      else
      {
        this.setStage(this.stage); // set to last stage
      }
      if (!application.selection.contains(solid))
      {
        application.selection.set(solid);
      }
    }
    else
    {
      this.angle = 0;
      this.updateAngleInPanel();
      this.setStage(4);
    }
  }

  revolveProfile(profile)
  {
    const application = this.application;

    const parent = profile.parent;
    application.removeObject(profile);
    const solid = new Solid();
    solid.name = "Revolve";
    const builder = new Revolver(0);
    solid.builder = builder;
    builder.optimize = !(profile.builder instanceof CircleBuilder);
    profile.matrix.decompose(solid.position, solid.rotation, solid.scale);
    solid.matrix.copy(profile.matrix);

    profile.visible = false;
    profile.matrix.identity();
    profile.matrix.decompose(
      profile.position, profile.rotation, profile.scale);

    solid.add(profile);
    ObjectBuilder.build(solid);
    application.addObject(solid, parent, false, true);

    return solid;
  }

  updateAngle(positionWorld)
  {
    const solid = this.solid;
    const builder = solid.builder;

    let position = new THREE.Vector3();
    position.copy(positionWorld);
    position.applyMatrix4(this.revolutionAxisMatrixWorldInverse);
    let angleRad = Math.atan2(-position.z, position.x);
    let angle = THREE.MathUtils.radToDeg(angleRad);
    if (builder.axis.y < 0) angle += 180;
    if (angle < 0) angle += 360;

    if (this.angle > 180 && angle === 0) angle = 360;

    this.angle = angle;

    this.updateAngleInPanel();
    this.updateRevolution();
  }

  updateRevolution(force = false)
  {
    const solid = this.solid;
    if (solid)
    {
      let revolver = solid.builder;
      if ((force || this.angle !== revolver.angle))
      {
        revolver.angle = this.angle;
        solid.needsRebuild = true;
        ObjectBuilder.build(solid);
        this.application.notifyObjectsChanged(solid);
      }
    }
  }

  updateAngleInPanel()
  {
    const k = 10000000;
    this.angleInputElem.value = Math.round(this.angle * k) / k;
  }

  isValidAxis(axis)
  {
    // TODO: also check axis does not intersect profile
    return axis.length() > 0.001;
  }

  addWheel()
  {
    const application = this.application;
    const solid = this.solid;
    const builder = solid.builder;

    const yAxis = new THREE.Vector3();
    yAxis.copy(builder.axis).normalize();
    const xAxis = builder.location.x > 0 ?
      new THREE.Vector3(-yAxis.y, yAxis.x, 0) :
      new THREE.Vector3(yAxis.y, -yAxis.x, 0);

    const zAxis = new THREE.Vector3();
    zAxis.crossVectors(xAxis, yAxis);

    const revolutionAxisMatrixWorld = this.revolutionAxisMatrixWorld;
    const revolutionAxisMatrixWorldInverse = this.revolutionAxisMatrixWorldInverse;

    revolutionAxisMatrixWorld.makeBasis(xAxis, yAxis, zAxis);
    revolutionAxisMatrixWorld.setPosition(builder.location);
    revolutionAxisMatrixWorld.premultiply(solid.matrixWorld);
    revolutionAxisMatrixWorldInverse.copy(revolutionAxisMatrixWorld).invert();

    const wheel = this.wheel;
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationX(-Math.PI / 2);
    let wheelMatrixWorld = wheel.matrixWorld;
    wheelMatrixWorld.copy(revolutionAxisMatrixWorld);
    wheelMatrixWorld.multiply(rotationMatrix);
    wheelMatrixWorld.decompose(wheel.position, wheel.quaternion, wheel.scale);
    wheel.updateMatrix();

    const divisions = 72;
    const angleIncr = 2 * Math.PI / divisions;
    for (let i = 0; i < divisions; i++)
    {
      let angle = i * angleIncr;
      let x = 0.5 * Math.cos(angle);
      let y = 0.5 * Math.sin(angle);
      this.wheelPoints[i].set(x, y, 0).applyMatrix4(wheelMatrixWorld);
    }
    application.overlays.add(wheel);
    application.repaint();
  }

  removeWheel()
  {
    this.application.overlays.remove(this.wheel);
    this.application.repaint();
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

export { RevolveTool };
