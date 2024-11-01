/*
 * AboutTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Dialog } from "../ui/Dialog.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "three";

class AboutTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "about";
    this.label = "tool.about.label";
    this.className = "about";
    this.setOptions(options);

    this.immediate = true;
  }

  execute()
  {
    const application = this.application;
    const appName = application.constructor.NAME;
    const appVersion = application.constructor.VERSION;
    let report = [];
    report.push([appName + " version", appVersion]);
    report.push(["ThreeJS revision", THREE.REVISION]);
    report.push(["User agent", navigator.userAgent]);
    if (!window.WebGLRenderingContext)
    {
      report.push(["WebGL status", "Not supported"]);
    }
    else
    {
      report.push(["WebGL status", "OK"]);
      let canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      document.body.appendChild(canvas);
      let gl;
      gl = canvas.getContext('webgl');
      if (!gl)
      {
       gl = canvas.getContext('experimental-webgl');
      }
      document.body.removeChild(canvas);
      if (gl)
      {
        report.push(["GL version", gl.getParameter(gl.VERSION)]);
        report.push(["GL vendor", gl.getParameter(gl.VENDOR)]);
        report.push(["GL renderer", gl.getParameter(gl.RENDERER)]);
        var dbgRenderInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (dbgRenderInfo !== null)
        {
          report.push(["Unmsk. rendered",
            gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL)]);
          report.push(["Unmsk. vendor",
            gl.getParameter(dbgRenderInfo.UNMASKED_VENDOR_WEBGL)]);
        }
      }
      else
      {
        report.push(["WebGL status", "ERROR"]);
      }
    }

    const dialog = new Dialog(this.label);
    dialog.setSize(400, 400);
    dialog.setI18N(application.i18n);

    const tabbedPane = new TabbedPane(dialog.bodyElem);

    const propsElem =
      tabbedPane.addTab("properties", "label.about_properties");

    let text = '<table style="text-align:left;">';
    for (let i = 0; i < report.length; i++)
    {
      text += `<tr>
                 <td style="width:40%;vertical-align:top">${report[i][0]}:</td>
                 <td style="width:60%">${report[i][1]}</td>
               </tr>`;
    }
    text += '</table>';

    propsElem.innerHTML = text;

    const modulesElem =
      tabbedPane.addTab("modules", "label.modules");

    text = '<ul style="padding:0;padding-left:16px">';
    for (let loadedModule of application.loadedModules)
    {
      text += `<li>
                 <div>${loadedModule}</div>
               </li>`;
    }
    text += '</ul>';
    modulesElem.innerHTML = text;

    let button = dialog.addButton("accept", "button.accept",
      () => dialog.hide());
    dialog.onShow = () => button.focus();
    dialog.show();
  }
}

export { AboutTool };