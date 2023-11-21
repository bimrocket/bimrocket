/*
 * DrawTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Cord } from "../core/Cord.js";
import { Profile } from "../core/Profile.js";
import { Controls } from "../ui/Controls.js";
import { PointSelector } from "../utils/PointSelector.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class DrawTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "draw";
    this.label = "tool.draw.label";
    this.help = "tool.draw.help";
    this.className = "draw";
    this.setOptions(options);

    this.mode = 0; // 0: add, 1: edit
    this.vertices = []; // Vector3[]
    this.index = -1;
    this.object = null; // Cord or Profile
    this.points = null; // THREE.Points
    this.position1World = null; // THREE.Vector3
    this.position2World = null; // THREE.Vector3
    this.inverseMatrixWorld = new THREE.Matrix4(); // object inverse matrixWorld

    this.addPointsMaterial = new THREE.PointsMaterial(
      { color : 0x008000, size : 4, sizeAttenuation : false,
        depthTest : false, transparent : true });

    this.editPointsMaterial = new THREE.PointsMaterial(
      { color : 0, size : 4, sizeAttenuation : false,
        depthTest : false, transparent : true });

    this._onPointerUp = this.onPointerUp.bind(this);
    this._onSelection = this.onSelection.bind(this);

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left", "panel_draw");
    this.panel.preferredHeight = 140;

    this.helpElem = document.createElement("div");
    this.panel.bodyElem.appendChild(this.helpElem);
    I18N.set(this.helpElem, "textContent", "tool.draw.help");

    this.offsetInputElem = Controls.addNumberField(this.panel.bodyElem,
      "draw_offset", "label.offset", 0);
    this.offsetInputElem.step = 0.1;
    this.offsetInputElem.addEventListener("change", event =>
    {
      this.applyOffset();
    }, false);

    this.buttonsElem = document.createElement("div");
    this.panel.bodyElem.appendChild(this.buttonsElem);

    this.finishButton = Controls.addButton(this.buttonsElem,
      "draw_finish", "button.finish", event => this.finish());

    this.profileButton = Controls.addButton(this.buttonsElem,
      "draw_make_profile", "button.make_profile", event => this.makeProfile());

    this.updatePanel();
  }

  activate()
  {
    this.panel.visible = true;
    const application = this.application;
    const container = application.container;
    container.addEventListener('pointerup', this._onPointerUp, false);
    application.addEventListener('selection', this._onSelection, false);
    application.pointSelector.filter =
      PointSelector.NO_SELECTION_ANCESTORS_FILTER;
    application.pointSelector.activate();
    this.setObject(application.selection.object);
  }

  deactivate()
  {
    this.panel.visible = false;
    const application = this.application;
    const container = application.container;
    container.removeEventListener('pointerup', this._onPointerUp, false);
    application.removeEventListener('selection', this._onSelection, false);
    application.pointSelector.deactivate();
    application.pointSelector.clearAxisGuides();
    this.clearPoints();
  }

  onSelection(event)
  {
    let object = event.objects.length > 0 ? event.objects[0] : null;
    this.setObject(object);
  }

  onPointerUp(event)
  {
    const pointSelector = this.application.pointSelector;
    if (!pointSelector.isPointSelectionEvent(event)) return;

    const selection = this.application.selection;

    let snap = pointSelector.snap;
    if (snap)
    {
      let positionWorld = snap.positionWorld;
      let position = new THREE.Vector3();
      this.transformVertex(positionWorld, position);
      let nextIndex = this.findVertex(position);

      if (this.mode === 0) // add to new object
      {
        if (nextIndex === -1) // add new vertex
        {
          this.vertices.push(position);
          this.index = this.vertices.length - 1;
          if (this.vertices.length === 1)
          {
            selection.clear();
            this.position1World = null;
          }
          else
          {
            this.position1World = this.position2World;
          }
          this.position2World = positionWorld;
        }
        else if (nextIndex === 0 && this.vertices.length >= 3) // close cord
        {
          this.makeProfile();
          this.position1World = null;
          this.position2World = null;
        }
        else // delete vertices
        {
          let deleted = this.vertices.length - nextIndex - 1;
          this.vertices.splice(nextIndex + 1, deleted);
          this.index = nextIndex;
          this.position1World = null;
          this.position2World = positionWorld;
        }
      }
      else // edit (mode === 1)
      {
        this.position1World = null;
        this.position2World = null;

        if (this.index !== -1) // vertex previously selected
        {
          if (nextIndex === -1)
          {
            // move vertex
            this.vertices[this.index] = position;
          }
          else if ((this.object instanceof Cord && this.vertices.length >= 3) &&
                ((this.index === 0 && nextIndex === this.vertices.length - 1) ||
                 (this.index === this.vertices.length - 1 && nextIndex === 0)))
          {
            this.makeProfile();
          }
          else if (this.object instanceof Profile &&
                   (this.index === 0 && nextIndex === this.vertices.length - 1))
          {
            this.vertices.splice(0, 1);
          }
          else if (this.object instanceof Profile &&
                   (this.index === this.vertices.length - 1 && nextIndex === 0))
          {
            this.vertices.splice(this.vertices.length - 1, 1);
          }
          else if (this.index === nextIndex + 1)
          {
            this.vertices.splice(this.index, 1);
          }
          else if (this.index === nextIndex - 1)
          {
            this.vertices.splice(nextIndex - 1, 1);
          }
          this.index = -1; // unselect vertex
          this.object.builder = null;
        }
        else // no vertex previously selected
        {
          if (nextIndex !== -1) // on object vertex
          {
            this.index = nextIndex;
          }
          else
          {
            nextIndex = this.findVertexOnEdge(position);
            if (nextIndex !== -1)
            {
              this.index = nextIndex;
              this.vertices.splice(nextIndex, 0, position);
            }
            else
            {
              this.mode = 0;
              this.index = 0;
              this.object = null;
              this.vertices = [positionWorld];
              this.position2World = positionWorld;
              selection.clear();
            }
          }
        }
      }
      this.updateObject();
      this.updatePoints();
      this.updateAxis(snap.object);
      this.updatePanel();
    }
    else
    {
      this.finish();
    }
  }

  setObject(object)
  {
    if (object &&
        !ObjectUtils.isObjectDescendantOf(object, this.application.scene))
    {
      // object removed
      object = null;
    }

    if (this.object !== object)
    {
      this.object = null;
      this.vertices = [];
      this.index = -1;
      this.position1World = null;
      this.position2World = null;

      if (object instanceof Cord)
      {
        this.object = object;
        this.vertices = [...this.object.geometry.points];
        this.mode = 1;
      }
      else if (object instanceof Profile)
      {
        this.object = object;
        let points2 = this.object.geometry.path.getPoints();
        this.vertices = [];
        for (let i = 0; i < points2.length - 1; i++)
        {
          let point2 = points2[i];
          this.vertices.push(new THREE.Vector3(point2.x, point2.y, 0));
        }
        this.mode = 1;
      }
    }

    this.updatePoints();
    this.updateAxis(object);
    this.updatePanel();
  }

  finish()
  {
    const application = this.application;
    const pointSelector = application.pointSelector;

    this.mode = 0; // add
    this.vertices = [];
    this.index = -1;
    this.object = null;
    this.position1World = null;
    this.position2World = null;

    this.updatePoints();
    this.updatePanel();

    pointSelector.clearAxisGuides();
    this.clearPoints();
    application.selection.clear();
  }

  makeProfile()
  {
    if (this.object instanceof Cord && this.vertices.length >= 3)
    {
      let parent = this.object.parent;
      let index = parent.children.indexOf(this.object);

      let object = new Profile();
      object.matrix.copy(this.object.matrix);
      this.flattenVertices(object);

      parent.children[index] = object;
      object.parent = parent;

      this.mode = 1;
      this.index = -1;

      this.object = object;
      this.updateObject();

      const application = this.application;
      application.notifyObjectsChanged(parent, this, "structureChanged");
      application.selection.set(object);
    }
  }

  flattenVertices(profile)
  {
    const vertices = this.vertices;
    let zAxis = GeometryUtils.calculateNormal(vertices);
    let yAxis = GeometryUtils.orthogonalVector(zAxis);
    let xAxis = new THREE.Vector3();
    xAxis.crossVectors(yAxis, zAxis);
    let position = GeometryUtils.centroid(vertices);
    let matrix = new THREE.Matrix4();
    matrix.makeBasis(xAxis, yAxis, zAxis);
    matrix.setPosition(position);
    let inverseMatrix = new THREE.Matrix4();
    inverseMatrix.copy(matrix).invert();
    for (let vertex of vertices)
    {
      vertex.applyMatrix4(inverseMatrix);
      vertex.z = 0;
    }
    matrix.premultiply(profile.matrix);
    matrix.decompose(profile.position, profile.rotation, profile.scale);
    profile.updateMatrix();
  }

  updateObject()
  {
    const application = this.application;

    if ((this.vertices.length < 2 && this.object instanceof Cord) ||
        (this.vertices.length < 3 && this.object instanceof Profile))
    {
      application.removeObject(this.object);
      this.mode = 0;
      this.object = null;
      this.index = -1;
      this.vertices = [];
    }
    else
    {
      let geometry;
      if (this.object)
      {
        if (this.object instanceof Cord)
        {
          geometry = new CordGeometry(this.vertices);
        }
        else
        {
          let shape = new THREE.Shape();
          for (let i = 0; i < this.vertices.length; i++)
          {
            let vertex = this.vertices[i];
            vertex.z = 0;
            if (i === 0)
            {
              shape.moveTo(vertex.x, vertex.y);
            }
            else
            {
              shape.lineTo(vertex.x, vertex.y);
            }
          }
          shape.closePath();
          geometry = new ProfileGeometry(shape);
        }
        this.object.updateGeometry(geometry);
        application.notifyObjectsChanged(this.object);
      }
      else if (this.vertices.length >= 2) // create Cord by default
      {
        let firstPoint = this.vertices[0];
        let offsetVector = GeometryUtils.getOffsetVectorForFloat32(firstPoint);
        if (offsetVector)
        {
          GeometryUtils.offsetRings(offsetVector, this.vertices);
        }
        geometry = new CordGeometry(this.vertices);
        this.object = new Cord(geometry, this.lineMaterial);
        if (offsetVector)
        {
          this.object.position.add(offsetVector);
          this.object.updateMatrix();
        }
        application.addObject(this.object, null, false, true);
      }
    }
  }

  updatePoints()
  {
    const application = this.application;

    this.clearPoints();

    let material = this.mode === 0 ?
      this.addPointsMaterial : this.editPointsMaterial;

    console.info(this.object, this.vertices);

    let transformedVertices;
    if (this.object)
    {
      // vertices are in object CS, transform to world CS
      transformedVertices = [];
      for (let vertex of this.vertices)
      {
        transformedVertices.push(
          vertex.clone().applyMatrix4(this.object.matrixWorld));
      }
    }
    else
    {
      // vertices are in world CS
      transformedVertices = this.vertices;
    }

    this.points = application.addOverlay(transformedVertices, false, null,
      material).points;
    application.repaint();
  }

  updateAxis(object)
  {
    const pointSelector = this.application.pointSelector;
    if (this.index === -1 || this.vertices.length === 0)
    {
      pointSelector.clearAxisGuides();
    }
    else
    {
      let positionWorld = this.vertices[this.index].clone();

      if (this.object) // positionWorld is local, convert to world
      {
        positionWorld.applyMatrix4(this.object.matrixWorld);
      }

      let axisMatrixWorld = object ?
        object.matrixWorld.clone() : new THREE.Matrix4();

      axisMatrixWorld.setPosition(positionWorld);
      pointSelector.setAxisGuides(axisMatrixWorld, true);
    }
  }

  updatePanel()
  {
    if (this.mode === 0)
    {
      if (this.vertices.length === 0)
      {
        I18N.set(this.helpElem, "textContent", "tool.draw.first_vertex");
      }
      else
      {
        I18N.set(this.helpElem, "textContent", "tool.draw.add_vertex");
      }
    }
    else if (this.mode === 1)
    {
      if (this.index === -1)
      {
        I18N.set(this.helpElem, "textContent", "tool.draw.select_vertex");
      }
      else
      {
        I18N.set(this.helpElem, "textContent", "tool.draw.vertex_destination");
      }
    }
    this.application.i18n.update(this.helpElem);

    if (this.position1World && this.position2World)
    {
      let offset = this.position1World.distanceTo(this.position2World);
      this.offsetInputElem.value = offset;
      this.offsetInputElem.parentElement.style.display = "";
    }
    else
    {
      this.offsetInputElem.parentElement.style.display = "none";
    }

    if (this.object instanceof Cord && this.vertices.length >= 3)
    {
      this.profileButton.style.display = "";
    }
    else
    {
      this.profileButton.style.display = "none";
    }
  }

  applyOffset()
  {
    let offset = parseFloat(this.offsetInputElem.value);
    let positionWorld = new THREE.Vector3();
    positionWorld.subVectors(this.position2World, this.position1World);
    positionWorld.normalize();
    positionWorld.multiplyScalar(offset);
    positionWorld.add(this.position1World);

    this.position2World = positionWorld;
    let position = new THREE.Vector3();
    this.transformVertex(positionWorld, position);
    this.vertices[this.index] = position;
    this.updateObject();
    this.updatePoints();
    this.updateAxis(this.object);
  }

  clearPoints()
  {
    if (this.points !== null)
    {
      this.application.removeObject(this.points);
      this.points = null;
    }
  }

  findVertex(position)
  {
    for (let i = 0; i < this.vertices.length; i++)
    {
      if (this.vertices[i].distanceToSquared(position) < 0.0001) return i;
    }
    return -1;
  }

  findVertexOnEdge(position)
  {
    if (this.object instanceof Profile)
    {
      for (let i = 0; i < this.vertices.length; i++)
      {
        let p1 = this.vertices[i];
        let p2 = this.vertices[(i + 1) % this.vertices.length];

        if (GeometryUtils.isPointOnSegment(position, p1, p2)) return i + 1;
      }
    }
    else
    {
      for (let i = 0; i < this.vertices.length - 1; i++)
      {
        let p1 = this.vertices[i];
        let p2 = this.vertices[i + 1];

        if (GeometryUtils.isPointOnSegment(position, p1, p2)) return i + 1;
      }
    }
    return -1;
  }

  transformVertex(pointWorld, point)
  {
    if (this.object)
    {
      // express pointWorld in object CS
      this.inverseMatrixWorld.copy(this.object.matrixWorld).invert();
      point.copy(pointWorld);
      point.applyMatrix4(this.inverseMatrixWorld);
      if (this.object instanceof Profile)
      {
        point.z = 0;
      }
    }
    else
    {
      point.copy(pointWorld);
    }
  }
}

export { DrawTool };