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

    const scope = this;

    this.frdRange.addEventListener("input",
      () => scope.frdValue.innerHTML = scope.frdRange.value, false);

    this.frdRange.addEventListener("change",
      () => application.frameRateDivisor = parseInt(scope.frdRange.value), 
      false);

    // Selection Paint mode

    this.selPaintModeSelect = Controls.addSelectField(this.panel.bodyElem, 
      "selpaint_mode", "Selection paint mode:", 
      [[BIMROCKET.Application.EDGES_SELECTION, "Edges"], 
       [BIMROCKET.Application.FACES_SELECTION, "Faces"]], null, 
     "option_block inline");

    this.selPaintModeSelect.addEventListener("change", (event) =>
    {
      application.selectionPaintMode = scope.selPaintModeSelect.value;
      application.updateSelection();
    });

    // Enable/disable deep selection

    const deepSelElem = document.createElement("div");
    deepSelElem.className = "option_block";
    this.panel.bodyElem.appendChild(deepSelElem);

    const deepSelLabel = document.createElement("label");
    deepSelLabel.innerHTML = "Deep selection: ";
    deepSelLabel.htmlFor = "deep_sel";
    deepSelLabel.style = "vertical-align:middle";

    deepSelElem.appendChild(deepSelLabel);

    this.deepSelCheckBox = document.createElement("input");
    this.deepSelCheckBox.id = "deep_sel";
    this.deepSelCheckBox.type = "checkbox";
    this.deepSelCheckBox.style = "vertical-align:middle";
    deepSelElem.appendChild(this.deepSelCheckBox);

    this.deepSelCheckBox.addEventListener("change", (event) =>
    {
      application.deepSelection = scope.deepSelCheckBox.checked;
      application.updateSelection();
    });
    
    // Background color
    
    this.backSelect = Controls.addSelectField(this.panel.bodyElem, 
      "backcolor_sel", "Background color:", 
      [["solid", "Solid"], ["gradient", "Gradient"]], 
      null, "option_block stack");
    const backColorElem = this.backSelect.parentElement;

    this.backSelect.addEventListener("change", (event) =>
    {
      if (scope.backSelect.value === "solid")
      {
        scope.backColorInput2.style.display = "none";
        application.backgroundColor = scope.backColorInput1.value;
      }
      else
      {
        scope.backColorInput2.style.display = "";
        application.backgroundColor1 = scope.backColorInput1.value;
        application.backgroundColor2 = scope.backColorInput2.value;
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

    this.backColorInput1.addEventListener("input", (event) =>
    {
      if (scope.backSelect.value === "solid")
      {
        application.backgroundColor = scope.backColorInput1.value;
      }
      else
      {
        application.backgroundColor1 = scope.backColorInput1.value;
      }
    }, false);

    this.backColorInput2.addEventListener("input", (event) =>
      application.backgroundColor2 = scope.backColorInput2.value, false);
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

    this.selPaintModeSelect.value = this.application.selectionPaintMode;
    this.deepSelCheckBox.checked = this.application.deepSelection;
  }

  deactivate()
  {
    this.panel.visible = false;
  }
};
