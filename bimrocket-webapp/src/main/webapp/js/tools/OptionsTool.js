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

    const frdElem = document.createElement("div");
    frdElem.className = "option_block";
    this.panel.bodyElem.appendChild(frdElem);

    const frdValueDiv = document.createElement("div");
    frdElem.appendChild(frdValueDiv);

    const frdLabel = document.createElement("label");
    frdLabel.innerHTML = "Frame rate divisor:";
    frdLabel.htmlFor = "frd_range";
    frdValueDiv.appendChild(frdLabel);

    this.frdValue = document.createElement("span");
    this.frdValue.innerHTML = "";
    this.frdValue.id = "frd_value";
    this.frdValue.innerHTML = application.frameRateDivisor;
    this.frdValue.style.marginLeft = "4px";
    frdValueDiv.appendChild(this.frdValue);

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

    this.frdRange.addEventListener("input",
      () => this.frdValue.innerHTML = this.frdRange.value, false);

    this.frdRange.addEventListener("change",
      () => application.frameRateDivisor = parseInt(this.frdRange.value), 
      false);

    // Selection Paint mode

    this.selPaintModeSelect = Controls.addSelectField(this.panel.bodyElem, 
      "selpaint_mode", "Selection paint mode:", 
      [[BIMROCKET.Application.EDGES_SELECTION, "Edges"], 
       [BIMROCKET.Application.FACES_SELECTION, "Faces"]], null, 
     "option_block inline");

    this.selPaintModeSelect.addEventListener("change", event =>
    {
      application.selectionPaintMode = this.selPaintModeSelect.value;
      application.updateSelection();
    });

    // Enable/disable deep selection visualization
    

    this.deepSelCheckBox = Controls.addInputField(this.panel.bodyElem, 
      "checkbox", "deep_sel", "Show deep selection:");
    this.deepSelCheckBox.style = "vertical-align:middle";
    this.deepSelCheckBox.parentElement.className = "option_block";
    this.deepSelCheckBox.addEventListener("change", event =>
      application.showDeepSelection = this.deepSelCheckBox.checked);
    
    // Enable/disable local axes visualization

    this.localAxesCheckBox = Controls.addInputField(this.panel.bodyElem, 
      "checkbox", "local_axes", "Show local axes:");
    this.localAxesCheckBox.style = "vertical-align:middle";
    this.localAxesCheckBox.parentElement.className = "option_block";
    this.localAxesCheckBox.addEventListener("change", event =>
      application.showLocalAxes = this.localAxesCheckBox.checked);
    
    // Background color
    
    this.backSelect = Controls.addSelectField(this.panel.bodyElem, 
      "backcolor_sel", "Background color:", 
      [["solid", "Solid"], ["gradient", "Gradient"]], 
      null, "option_block stack");
    const backColorElem = this.backSelect.parentElement;

    this.backSelect.addEventListener("change", event =>
    {
      if (this.backSelect.value === "solid")
      {
        this.backColorInput2.style.display = "none";
        application.backgroundColor = this.backColorInput1.value;
      }
      else
      {
        this.backColorInput2.style.display = "";
        application.backgroundColor1 = this.backColorInput1.value;
        application.backgroundColor2 = this.backColorInput2.value;
      }
    }, false);

    this.backColorInput1 = document.createElement("input");
    this.backColorInput1.id = "back_color1";
    this.backColorInput1.type = "color";
    this.backColorInput1.className = "back_color";
    backColorElem.appendChild(this.backColorInput1);

    this.backColorInput2 = document.createElement("input");
    this.backColorInput2.id = "back_color2";
    this.backColorInput2.type = "color";
    this.backColorInput2.className = "back_color";
    backColorElem.appendChild(this.backColorInput2);

    this.backColorInput1.addEventListener("input", event =>
    {
      if (this.backSelect.value === "solid")
      {
        application.backgroundColor = this.backColorInput1.value;
      }
      else
      {
        application.backgroundColor1 = this.backColorInput1.value;
      }
    }, false);

    this.backColorInput2.addEventListener("input", event =>
      application.backgroundColor2 = this.backColorInput2.value, false);

    this.panelOpacityRange = Controls.addInputField(this.panel.bodyElem, 
      "range", "panelopac_range", "Panel opacity:", null, "option_block stack");
    this.panelOpacityRange.min = 1;
    this.panelOpacityRange.max = 100;
    this.panelOpacityRange.step = 1;
    this.panelOpacityRange.style.display = "inline-block";
    this.panelOpacityRange.style.width = "80%";
    this.panelOpacityRange.style.marginLeft = "auto";
    this.panelOpacityRange.style.marginRight = "auto";

    this.panelOpacityRange.addEventListener("input", () => 
      application.panelOpacity = 0.01 * parseInt(this.panelOpacityRange.value), 
      false);
  }

  activate()
  {
    this.panel.visible = true;

    const application = this.application;

    this.backColorInput1.value = application.backgroundColor1;
    this.backColorInput2.value = application.backgroundColor2;

    if (application.backgroundColor1 === application.backgroundColor2)
    {
      this.backSelect.value = "solid";
      this.backColorInput2.style.display = "none";
    }
    else
    {
      this.backSelect.value = "gradient";
      this.backColorInput2.style.display = "";
    }

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
    let text = '<table style="text-align:left;font-size:10px">';
    for (let i = 0; i < report.length; i++)
    {
      text += '<tr>';
      text += '<td style="width:40%;vertical-align:top">' +
        report[i][0] + ':</td><td style="width:60%">' + report[i][1] + '</td>';
      text += '</tr>';
    }
    text += '</table>';
    this.reportElem.innerHTML = text;
    this.frdValue.innerHTML = this.application.frameRateDivisor;

    this.selPaintModeSelect.value = application.selectionPaintMode;
    this.deepSelCheckBox.checked = application.showDeepSelection;
    this.localAxesCheckBox.checked = application.showLocalAxes;
    this.panelOpacityRange.value = 100 * application.panelOpacity;
  }

  deactivate()
  {
    this.panel.visible = false;
  }
};
