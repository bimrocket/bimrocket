/*
 * SVGExporterTool.js
 *
 * @author jespada
 */

import { Tool } from "./Tool.js";
import { Solid } from "../core/Solid.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import { WebUtils } from "../utils/WebUtils.js";
import { Controls } from "../ui/Controls.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class SVGExporterTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "svg_exporter";
    this.label = "tool.svg_exporter.label";
    this.className = "svg_exporter";
    this.setOptions(options);
    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 120;

    this.titleElem = Controls.addTextField(this.panel.bodyElem,
      "svg_exporter_title", "label.svg_exporter_title", "", "row");

    this.scaleElem = Controls.addTextField(this.panel.bodyElem,
      "print_scale", "label.print_scale", "10", "row");
      this.scaleElem.style.width = "60px";

    this.svgExportButton = Controls.addButton(this.panel.bodyElem,
      "svg_exporter_button", "button.export", () => this.exportSvg());

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

  exportSvg()
  {
    this.svgExportButton.disabled = true;
    this.application.progressBar.progress = undefined;
    this.application.progressBar.visible = true;
    this.application.progressBar.message = "";

    setTimeout(() => this.generateSvg(), 100);
  }

  generateSvg()
  {
    const application = this.application;
    let scale = parseFloat(this.scaleElem.value);
    // assume units in meters
    let factor = 1 * 39.37007874 * 72; // dots per meter
    factor /= scale;

    let matrix = new THREE.Matrix4();
    matrix.makeTranslation(297, 382, 0);
    matrix.multiply((new THREE.Matrix4()).makeScale(factor, factor, factor));
    matrix.multiply(application.camera.matrixWorldInverse);

    let svgExportSource =
    {
      title: this.titleElem.value || "Bimrocket_SVG_export.svg",
      strOut: "",
      writeHiddenEdges : true,
      bbox : new THREE.Box2(),
      debug : { testIfcElement : undefined }
    };

    let writeFromRootElement =
      svgExportSource.debug.testIfcElement === undefined
      && this.application.selection.objects.length === 0;

    this.generateSvgObject(application.baseObject, matrix, svgExportSource, 1,
      writeFromRootElement);

    this.svgExportButton.disabled = false;
    this.application.progressBar.visible = false;

    const boxX = svgExportSource.bbox.min.x;
    const boxY = -svgExportSource.bbox.max.y;
    const boxWidth = svgExportSource.bbox.max.x - svgExportSource.bbox.min.x;
    const boxHeight = svgExportSource.bbox.max.y - svgExportSource.bbox.min.y;

    const content = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
version="1.1" viewBox="${boxX} ${boxY} ${boxWidth} ${boxHeight}">
<defs>
    <style type="text/css"><![CDATA[
       path {
         stroke: black;
         fill: none;
         stroke-width: 2;
       }

       line {
         stroke: black;
         stroke-width: 2;
       }
    ]]></style>
  </defs>
<g id="root" transform="matrix(1,0,0,-1,0,0)">\n${svgExportSource.strOut}</g></svg>`;

    const encodedUri = encodeURI("data:text/svg;charset=utf-8," + content);

    // override out
    this.openLink.setAttribute("href", encodedUri);
    this.openLink.setAttribute("download", svgExportSource.title + ".svg");

    this.openLink.click();
  }

  indent(level)
  {
    let str = "";
    for (let i = 0; i < level; i++)
    {
      str += "\t";
    }
    return str;
  }

  writeSvgShape(object, matrix, svgExportSource, level, _writeSvgShape = true)
  {
    if (object instanceof Solid
        || object instanceof THREE.Mesh
        || object instanceof THREE.Line)
    {
      if (_writeSvgShape === false)
      {
        return true;
      }
    }

    if (object instanceof Solid)
    {
      if (svgExportSource.writeHiddenEdges === true
          || object.edgesVisible === true)
      {
        let edgesGeometry = object.edgesGeometry;
        let vertices = GeometryUtils.getBufferGeometryVertices(edgesGeometry);

        let p1 = new THREE.Vector3();
        let p2 = new THREE.Vector3();

        let drawnLines = new Set();

        // draw set of lines
        for (let i = 0; i < vertices.length; i += 2)
        {
          p1.copy(vertices[i]);
          p1.applyMatrix4(object.matrixWorld);
          p1.applyMatrix4(matrix);

          p2.copy(vertices[i + 1]);
          p2.applyMatrix4(object.matrixWorld);
          p2.applyMatrix4(matrix);

          // 1 point skip
          if (p1.x === p2.x && p1.y === p2.y)
          {
            continue;
          }

          let line1Id = `${p1.x},${p1.y},${p2.x},${p2.y}`;
          let line2Id = `${p2.x},${p2.y},${p1.x},${p1.y}`;

          // write only lines that not overlap
          if (!drawnLines.has(line1Id) && !drawnLines.has(line2Id))
          {
            svgExportSource.strOut += this.indent(level + 1) +
              `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" />\n`;

            drawnLines.add(line1Id);

            // update 2d bounding box
            svgExportSource.bbox.expandByPoint(p1);
            svgExportSource.bbox.expandByPoint(p2);
          }
        }
        return true;
      }
    }
    else if (object instanceof THREE.Mesh)
    {
      let geometry = object.geometry;
      if (geometry instanceof THREE.BufferGeometry)
      {
        GeometryUtils.getBufferGeometryFaces(
          // three mesh
          geometry,
          // callback foreach vertex converted conversion
          (va, vb, vc) =>
          {
            const vertices = GeometryUtils.getBufferGeometryVertices(geometry);
            const p1 = new THREE.Vector3();
            const p2 = new THREE.Vector3();
            const p3 = new THREE.Vector3();

            p1.copy(vertices[va]);
            p2.copy(vertices[vb]);
            p3.copy(vertices[vc]);
            p1.applyMatrix4(object.matrixWorld);
            p2.applyMatrix4(object.matrixWorld);
            p3.applyMatrix4(object.matrixWorld);
            p1.applyMatrix4(matrix);
            p2.applyMatrix4(matrix);
            p3.applyMatrix4(matrix);

            // update 2d bounding box
            svgExportSource.bbox.expandByPoint(p1);
            svgExportSource.bbox.expandByPoint(p2);
            svgExportSource.bbox.expandByPoint(p3);

            // draw polyline
            svgExportSource.strOut += this.indent(level + 1) +
              `<path d="M${p1.x},${p1.y} L${p2.x},${p2.y} L${p3.x},${p3.y} L${p1.x},${p1.y}" />\n`;
          }
        );
        return true;
      }
    }
    else if (object instanceof THREE.Line)
    {
      // skip lines
      return true;
    }
    return false;
  }

  generateSvgObject(object, matrix, svgExportSource, level = 0,
    _writeSvgShape = true)
  {
    let uuid = THREE.MathUtils.generateUUID();
    let globalId = "unknow";
    let ifcClassName = "unknow";

    if (object.userData.IFC)
    {
      if (object.userData.IFC.GlobalId)
      {
        globalId = object.userData.IFC.GlobalId;
      }
      ifcClassName = object.userData.IFC.ifcClassName;
    }

    if (object.userData.IFC_type)
    {
      if (globalId === "unknow")
      {
        if (object.userData.IFC_type.GlobalId)
        {
          globalId = object.userData.IFC_type.GlobalId;
        }
      }

      if (ifcClassName === "unknow")
      {
        if (object.userData.IFC_type.ifcClassName)
        {
          ifcClassName = object.userData.IFC_type.ifcClassName;
        }
      }
    }

    // drawable elements
    // object

    if (svgExportSource.debug.testIfcElement)
    {
      if (globalId === svgExportSource.debug.testIfcElement)
      {
        _writeSvgShape = true;
      }
    }
    else
    {
      // do not process not selected objects...
      if (this.application.selection.contains(object))
      {
        _writeSvgShape = true;
      }
    }

    if (_writeSvgShape === true)
    {
      const id = uuid + "_" + globalId + "_" + ifcClassName;

      svgExportSource.strOut += this.indent(level) +
        `<g id="${id}" data-guid="${globalId}" data-class-name="${ifcClassName}">\n`;
    }

    if (this.writeSvgShape(object, matrix,
        svgExportSource, level, _writeSvgShape) === false)
    {
      for (let child of object.children)
      {
        if (child.visible)
        {
          this.generateSvgObject(child, matrix, svgExportSource,
            _writeSvgShape ? level + 1 : level, _writeSvgShape);
        }
      }
    }

    if (_writeSvgShape === true)
    {
      svgExportSource.strOut += this.indent(level) + "</g>\n";
    }
  }
}

export { SVGExporterTool };
