/*
 * PrintTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Solid } from "../core/Solid.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import { WebUtils } from "../utils/WebUtils.js";
import { Controls } from "../ui/Controls.js";
import { MessageDialog } from "../ui/MessageDialog.js";
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

    this.titleElem = Controls.addTextField(this.panel.bodyElem,
      "print_title", "label.print_title", "", "row");

    this.scaleElem = Controls.addTextField(this.panel.bodyElem,
      "print_scale", "label.print_scale", "10", "row");
    this.scaleElem.style.width = "60px";

    this.printButton = Controls.addButton(this.panel.bodyElem,
      "print_button", "button.print", () => this.print());

    this.openLink = document.createElement("a");
    I18N.set(this.openLink, "textContent", "button.open");
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

  print()
  {
    this.printButton.disabled = true;
    this.application.progressBar.progress = undefined;
    this.application.progressBar.visible = true;
    this.application.progressBar.message = "";

    setTimeout(() => this.drawScene(), 100);
  }

  drawScene()
  {
    const application = this.application;
    const request = new XMLHttpRequest();
    const serviceUrl = location.protocol + "//" + location.host +
      "/bimrocket-server/api/print";

    let scale = parseFloat(this.scaleElem.value);
    // assume units in meters
    let factor = 1 * 39.37007874 * 72; // dots per meter
    factor /= scale;

    let matrix = new THREE.Matrix4();
    matrix.makeTranslation(297, 382, 0);
    matrix.multiply((new THREE.Matrix4()).makeScale(factor, factor, factor));
    matrix.multiply(application.camera.matrixWorldInverse);

    let printSource =
    {
      title : this.titleElem.value || "Bimrocket print",
      commands : []
    };

    this.drawObject(application.baseObject, matrix, printSource);

    request.open("POST", serviceUrl, true);
    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    request.onload = () =>
    {
      this.printButton.disabled = false;
      this.application.progressBar.visible = false;

      if (request.status === 200)
      {
        let printResult = JSON.parse(request.responseText);
        this.openLink.href = serviceUrl + "/" + printResult.id;
        this.openLink.click();
      }
      else this.showError(request);
    };
    request.onerror = () =>
    {
      this.printButton.disabled = false;
      this.application.progressBar.visible = false;

      this.showError(request);
    };
    request.send(JSON.stringify(printSource));
  }

  drawObject(object, matrix, printSource)
  {
    const commands = printSource.commands;

    if (object instanceof Solid)
    {
      try
      {
        if (object.edgesVisible)
        {
          let edgesGeometry = object.edgesGeometry;
          let vertices =
            GeometryUtils.getBufferGeometryVertices(edgesGeometry);

          let p1 = new THREE.Vector3();
          let p2 = new THREE.Vector3();

          for (let i = 0; i < vertices.length; i += 2)
          {
            p1.copy(vertices[i]);
            p1.applyMatrix4(object.matrixWorld);
            p1.applyMatrix4(matrix);

            p2.copy(vertices[i + 1]);
            p2.applyMatrix4(object.matrixWorld);
            p2.applyMatrix4(matrix);

            commands.push({ "type" : "moveto", "args" : [p1.x, p1.y] });
            commands.push({ "type" : "lineto", "args" : [p2.x, p2.y] });
            commands.push({ "type" : "stroke" });
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

          commands.push({ "type" : "moveto", "args" : [p1.x, p1.y] });
          commands.push({ "type" : "lineto", "args" : [p2.x, p2.y] });
          commands.push({ "type" : "lineto", "args" : [p3.x, p3.y] });
          commands.push({ "type" : "lineto", "args" : [p1.x, p1.y] });
          commands.push({ "type" : "stroke" });
        };

        GeometryUtils.getBufferGeometryFaces(geometry, printFace);
      }
    }
    else if (object instanceof THREE.Line)
    {
    }
    else
    {
      for (let child of object.children)
      {
        if (child.visible)
        {
          this.drawObject(child, matrix, printSource);
        }
      }
    }
  }

  showError(request)
  {
    let status = request.status;

    let message;

    let statusMessage = WebUtils.getHttpStatusMessage(status);
    if (statusMessage.length > 0)
    {
      message = statusMessage;
    }
    else
    {
      message = "Error";
    }
    message += " (HTTP " + status + ").";

    MessageDialog.create("ERROR", message)
      .setClassName("error")
      .setI18N(this.application.i18n).show();
  }
}

export { PrintTool };
