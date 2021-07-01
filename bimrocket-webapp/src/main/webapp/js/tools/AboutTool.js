/* 
 * AboutTool.js
 * 
 * @autor: realor
 */

BIMROCKET.AboutTool = class extends BIMROCKET.Tool
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
    let report = [];
    report.push(["BIMROCKET version", BIMROCKET.VERSION]);
    report.push(["ThreeJS revision", THREE.REVISION]);
    if (!window.WebGLRenderingContext)
    {
      report.push(["WebGL status", "Not supported"]);
    }
    else
    {
      report.push(["WebGL status", "OK"]);
      var canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      document.body.appendChild(canvas);
      var gl;
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
    let text = '<table style="text-align:left;">';
    for (let i = 0; i < report.length; i++)
    {
      text += '<tr>';
      text += '<td style="width:40%;vertical-align:top">' +
        report[i][0] + ':</td><td style="width:60%">' + report[i][1] + '</td>';
      text += '</tr>';
    }
    text += '</table>';   
    
    const dialog = new BIMROCKET.Dialog("About", 340, 300);
    dialog.bodyElem.innerHTML = text;
    
    let button = dialog.addButton("accept", "Accept", 
      () => dialog.hide());
    dialog.onShow = () => button.focus();
    dialog.show();
  }
};