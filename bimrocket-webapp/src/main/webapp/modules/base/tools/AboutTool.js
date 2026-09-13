/*
 * AboutTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { Dialog } from "platform/ui/dialog/Dialog.js";
import { TabbedPane } from "platform/ui/tabbedpane/TabbedPane.js";
import { I18N } from "platform/i18n/I18N.js";
import * as THREE from "three";

class AboutTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "about";
    this.label = "base|tool.about.label";
    this.className = "about";
    this.iconName = "base|about";

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    const application = this.application;
    const appName = application.constructor.NAME;
    const appVersion = application.constructor.VERSION;
    const baseUrl = application.baseUrl;

    let report = [];
    report.push([appName + " version", appVersion]);
    report.push(["ThreeJS revision", THREE.REVISION]);
    report.push(["ThreeJS renderer", application.renderer.constructor.name]);
    report.push(["Base URL", baseUrl]);
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
      gl = canvas.getContext("webgl2");
      if (!gl)
      {
        gl = canvas.getContext("webgl");
        if (!gl)
        {
          gl = canvas.getContext("experimental-webgl");
        }
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
    dialog.setSize(400, 410);
    dialog.setI18N(application.i18n);

    dialog.bodyElem.style.overflow = "hidden";
    dialog.bodyElem.classList.add("flex");
    dialog.bodyElem.classList.add("flex-column");
    dialog.bodyElem.innerHTML = `
         <div class="logo flex">
         </div>
         <div class="properties flex-grow-1">
         </div>`;

    const logoElem = dialog.bodyElem.querySelector(".logo");
    logoElem.style.justifyContent = "center";
    logoElem.style.paddingBottom = "8px";
    const propsElem = dialog.bodyElem.querySelector(".properties");
    const icon = Controls.addIcon(logoElem, "bimrocket", "logo");
    icon.style.height = "32px";
    propsElem.style.overflow = "auto";

    let text = `<ul class="list-style-none p-0 ml-2 mr-2 border-1 box-shadow-1">`;
    for (let i = 0; i < report.length; i++)
    {
      text += `<li class="field-row w-50 m-0 p-2 border-separator-top bg-hover">
                 <div class="label">${report[i][0]}:</div>
                 <div class="value">${report[i][1]}</div>
               </li>`;
    }
    text += "</url>";

    propsElem.innerHTML = text;

    let button = dialog.addButton("accept", "button.accept",
      () => dialog.hide());
    dialog.onShow = () => button.focus();
    dialog.show();
  }
}

export { AboutTool };