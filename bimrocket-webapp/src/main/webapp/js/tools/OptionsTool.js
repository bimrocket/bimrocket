/* 
 * OptionsTool.js
 * 
 * @autor: realor
 */

BIMROCKET.OptionsTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {    
    super(application);
    this.name = "options";
    this.label = "tool.options.label";
    this.help = "tool.options.help";
    this.className = "options";
    this.setOptions(options);
    this.createPanel();
  }

  createPanel()
  {
    const application = this.application;

    this.panel = application.createPanel(
      "panel_" + this.name, this.label, "left");
    
    var helpElem = document.createElement("div");
    helpElem.innerHTML = I18N.get(this.help);
    this.panel.bodyElem.appendChild(helpElem);

    this.reportElem = document.createElement("div");
    this.panel.bodyElem.appendChild(this.reportElem);

    // Frame rate divisor

    var frdElem = document.createElement("div");
    frdElem.className = "option_block";
    this.panel.bodyElem.appendChild(frdElem);

    var frdLabel = document.createElement("label");
    frdLabel.innerHTML = "Frame rate divisor:";
    frdLabel.htmlFor = "frd_range";
    frdElem.appendChild(frdLabel);

    this.frdValue = document.createElement("span");
    this.frdValue.innerHTML = "";
    this.frdValue.id = "frd_value";
    this.frdValue.innerHTML = application.frameRateDivisor;
    this.frdValue.style.marginLeft = "4px";
    frdElem.appendChild(this.frdValue);

    this.frdRange = document.createElement("input");
    this.frdRange.id = "frd_range";
    this.frdRange.type = "range";
    this.frdRange.min = 1;
    this.frdRange.max = 10;
    this.frdRange.step = 1;
    this.frdRange.value = application.frameRateDivisor;
    this.frdRange.style.display = "inline-block";
    this.frdRange.style.width = "80%";
    this.frdRange.style.marginLeft = "auto";
    this.frdRange.style.marginRight = "auto";

    frdElem.appendChild(this.frdRange);

    var scope = this;

    this.frdRange.addEventListener("input", 
      function() {
       scope.frdValue.innerHTML = scope.frdRange.value;
     }, false);

    this.frdRange.addEventListener("change", 
      function() {
        application.frameRateDivisor = parseInt(scope.frdRange.value);
     }, false);

    // Selection Paint mode

    var selPaintModeElem = document.createElement("div");
    selPaintModeElem.className = "option_block";

    this.panel.bodyElem.appendChild(selPaintModeElem);
    
    var selPaintModeLabel = document.createElement("label");
    selPaintModeLabel.innerHTML = "Selection paint mode: ";
    selPaintModeLabel.htmlFor = "sel_paint_mode";
    selPaintModeElem.appendChild(selPaintModeLabel);
    
    this.selPaintModeSelect = document.createElement("select");
    this.selPaintModeSelect.id = "sel_paint_mode";
    selPaintModeElem.appendChild(this.selPaintModeSelect);

    var selEdges = document.createElement("option");
    selEdges.value = BIMROCKET.Application.EDGES_SELECTION;
    selEdges.innerHTML = BIMROCKET.Application.EDGES_SELECTION;
    this.selPaintModeSelect.appendChild(selEdges);
    
    var selTriangles = document.createElement("option");
    selTriangles.value = BIMROCKET.Application.FACES_SELECTION;
    selTriangles.innerHTML = BIMROCKET.Application.FACES_SELECTION;
    this.selPaintModeSelect.appendChild(selTriangles);
    
    this.selPaintModeSelect.addEventListener("change", function(event)
    {
      application.selectionPaintMode = scope.selPaintModeSelect.value;
      application.updateSelection();
    });

    // Show hidden selection

    var hiddenSelElem = document.createElement("div");
    hiddenSelElem.className = "option_block";
    this.panel.bodyElem.appendChild(hiddenSelElem);
    
    var hiddenSelLabel = document.createElement("label");
    hiddenSelLabel.innerHTML = "Show hidden selection: ";
    hiddenSelLabel.htmlFor = "hidden_sel";
    hiddenSelLabel.style = "vertical-align:middle";

    hiddenSelElem.appendChild(hiddenSelLabel);
    
    this.hiddenSelCheckBox = document.createElement("input");
    this.hiddenSelCheckBox.id = "hidden_sel";
    this.hiddenSelCheckBox.type = "checkbox";
    this.hiddenSelCheckBox.style = "vertical-align:middle";
    hiddenSelElem.appendChild(this.hiddenSelCheckBox);

    this.hiddenSelCheckBox.addEventListener("change", function(event)
    {
      application.showHiddenSelection = scope.hiddenSelCheckBox.checked;
      application.updateSelection();
    });
  
  }

  activate()
  {
    this.panel.visible = true;

    var report = [];
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
    var text = '<table style="text-align:left;font-size:10px">';
    for (var i = 0; i < report.length; i++)
    {
      text += '<tr>';
      text += '<td style="width:40%;vertical-align:top">' + 
        report[i][0] + ':</td><td style="width:60%">' + report[i][1] + '</td>';
      text += '</tr>';
    }
    text += '</table>';
    this.reportElem.innerHTML = text;
    this.frdValue.innerHTML = this.application.frameRateDivisor;
    
    this.selPaintModeSelect.value = this.application.selectionPaintMode;
    this.hiddenSelCheckBox.checked = this.application.showHiddenSelection;
  }

  deactivate()
  {
    this.panel.visible = false;
  }
};
