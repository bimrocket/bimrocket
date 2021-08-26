/*
 * PrintTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";
import { Solid } from "../core/Solid.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class PrintTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "print";
    this.label = "tool.print.label";
    this.help = "tool.print.help";
    this.className = "print";
    this.setOptions(options);
    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 120;

    const scalePanel = document.createElement("div");
    this.panel.bodyElem.appendChild(scalePanel);

    const scaleLabel = document.createElement("label");
    scaleLabel.innerHTML = "Scale = 1 : ";
    scalePanel.appendChild(scaleLabel);

    this.scaleInput = document.createElement("input");
    this.scaleInput.type = "text";
    this.scaleInput.value = "10";
    this.scaleInput.style.width = "60px";
    scalePanel.appendChild(this.scaleInput);

    const printButton = document.createElement("button");
    printButton.innerHTML = "Generate PDF";
    this.panel.bodyElem.appendChild(printButton);
    printButton.addEventListener('click',
      () => this.drawScene(), false);

    this.openLink = document.createElement("a");
    I18N.set(this.openLink, "innerHTML", "button.open");
    this.openLink.target = "_blank";
    this.openLink.style.display = "none";
    this.panel.bodyElem.appendChild(this.openLink);
  }

  activate()
  {
    this.panel.visible = true;
  }

  deactivate()
  {
    this.panel.visible = false;
  }

  drawScene()
  {
    const application = this.application;
    var request = new XMLHttpRequest();
    var url = location.protocol + "//" + location.host +
      "/bimrocket-server/api/print/sample.pdf";
    console.info("print url: " + url);
    this.openLink.href = url;

    var scale = parseFloat(this.scaleInput.value);
    // assume units in meters
    var factor = 1 * 39.37007874 * 72; // dots per meter
    factor /= scale;

    var matrix = new THREE.Matrix4();
    matrix.makeTranslation(297, 382, 0);
    matrix.multiply((new THREE.Matrix4()).makeScale(factor, factor, factor));
    matrix.multiply(application.camera.matrixWorldInverse);

    var data = this.drawObject(application.baseObject, matrix);

    request.open("POST", url, true);
    request.onreadystatechange = () =>
    {
      if (request.readyState === 4)
      {
        if (request.status === 0 || request.status === 200)
        {
          this.openLink.click();
        }
      }
    };
    console.info(data);
    request.send(data);
  }

  drawObject(object, matrix)
  {
    var data = "";
    if (object instanceof Solid)
    {
      try
      {
        if (object.edgesVisible)
        {
          var edgesGeometry = object.edgesGeometry;
          var vertices =
            GeometryUtils.getBufferGeometryVertices(edgesGeometry);

          var p1 = new THREE.Vector3();
          var p2 = new THREE.Vector3();

          for (var i = 0; i < vertices.length; i += 2)
          {
            p1.copy(vertices[i]);
            p1.applyMatrix4(object.matrixWorld);
            p1.applyMatrix4(matrix);

            p2.copy(vertices[i + 1]);
            p2.applyMatrix4(object.matrixWorld);
            p2.applyMatrix4(matrix);

            data += "moveto " + p1.x + " " + p1.y + "\n";
            data += "lineto " + p2.x + " " + p2.y + "\n";
            data += "stroke\n";
          }
        }
      }
      catch (ex)
      {
        console.error(ex);
      }
    }
    else if (object instanceof THREE.Mesh)
    {
      var geometry = object.geometry;
      if (geometry instanceof THREE.BufferGeometry)
      {
        const vertices = GeometryUtils.getBufferGeometryVertices(geometry);

        const p1 = new THREE.Vector3();
        const p2 = new THREE.Vector3();
        const p3 = new THREE.Vector3();

        const printFace = function(va, vb, vc)
        {
          p1.copy(vertices[va]);
          p2.copy(vertices[vb]);
          p3.copy(vertices[vc]);
          p1.applyMatrix4(object.matrixWorld);
          p2.applyMatrix4(object.matrixWorld);
          p3.applyMatrix4(object.matrixWorld);
          p1.applyMatrix4(matrix);
          p2.applyMatrix4(matrix);
          p3.applyMatrix4(matrix);
          data += "moveto " + p1.x + " " + p1.y + "\n";
          data += "lineto " + p2.x + " " + p2.y + "\n";
          data += "lineto " + p3.x + " " + p3.y + "\n";
          data += "lineto " + p1.x + " " + p1.y + "\n";
          data += "stroke\n";
        };

        GeometryUtils.getBufferGeometryFaces(geometry, printFace);
      }
    }
    var children = object.children;
    for (var j = 0; j < children.length; j++)
    {
      var child = children[j];
      if (child.visible)
      {
        if (object instanceof Solid)
        {
          // skip
        }
        else
        {
          data += this.drawObject(child, matrix);
        }
      }
    }
    return data;
  }
}

export { PrintTool };
