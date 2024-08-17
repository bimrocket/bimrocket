/**
 * Setup.js
 *
 * @author realor
 */

import { Application } from "../ui/Application.js";

class Setup
{
  static PREFIX = "bimrocket.";

  constructor(application)
  {
    this.application = application;

    // restore setup from localStorage

    this._userLanguage = this.getItem("language") || navigator.language;

    this._units = this.getItem("units") || "m";

    this._decimals = parseInt(this.getItem("decimals") || "2");

    this.restoreBackground();

    let opacityValue = this.getItem("panelOpacity");
    this._panelOpacity = opacityValue ? parseFloat(opacityValue) : 0.8;

    let frd = this.getItem("frameRateDivisor");
    this._frameRateDivisor = frd ? parseInt(frd) : 1;

    this._selectionPaintMode =
      this.getItem("selectionPaintMode") || Application.EDGES_SELECTION;

    this._shadowsEnabled = this.getItem("shadowsEnabled") === "true";

    this._showDeepSelection = this.getItem("showDeepSelection") !== "false";

    this._showLocalAxes = this.getItem("showLocalAxes") !== "false";
  }

  get userLanguage()
  {
    return this._userLanguage;
  }

  set userLanguage(userLanguage)
  {
    this._userLanguage = userLanguage;

    const application = this.application;
    const i18n = application.i18n;
    i18n.userLanguages = userLanguage;
    i18n.updateTree(application.element);
    this.setItem("language", userLanguage);
  }

  get units()
  {
    return this._units;
  }

  set units(units)
  {
    this._units = units;
    this.setItem("units", units);
  }

  get decimals()
  {
    return this._decimals;
  }

  set decimals(decimals)
  {
    this._decimals = decimals;
    this.setItem("decimals", String(decimals));
  }

  get backgroundColor()
  {
    return this._backgroundColor1;
  }

  set backgroundColor(color)
  {
    this._backgroundColor1 = color;
    this._backgroundColor2 = color;
    this.applyBackground();
    this.saveBackground();
  }

  get backgroundColor1()
  {
    return this._backgroundColor1;
  }

  set backgroundColor1(color)
  {
    this._backgroundColor1 = color;
    this.applyBackground();
    this.saveBackground();
  }

  get backgroundColor2()
  {
    return this._backgroundColor2;
  }

  set backgroundColor2(color)
  {
    this._backgroundColor2 = color;
    this.applyBackground();
    this.saveBackground();
  }

  get panelOpacity()
  {
    return this._panelOpacity;
  }

  set panelOpacity(opacity)
  {
    this._panelOpacity = opacity;
    this.setItem("panelOpacity", String(opacity));
    let panels = this.application.panelManager.getPanels();
    for (let panel of panels)
    {
      panel.opacity = opacity;
    }
  }

  get frameRateDivisor()
  {
    return this._frameRateDivisor;
  }

  set frameRateDivisor(frd)
  {
    this._frameRateDivisor = frd;
    this.setItem("frameRateDivisor", String(frd));
  }

  get selectionPaintMode()
  {
    return this._selectionPaintMode;
  }

  set selectionPaintMode(selMode)
  {
    this._selectionPaintMode = selMode;
    this.setItem("selectionPaintMode", selMode);
  }

  get showDeepSelection()
  {
    return this._showDeepSelection;
  }

  set showDeepSelection(enabled)
  {
    this._showDeepSelection = enabled;
    this.setItem("showDeepSelection", enabled);
    this.application.updateSelection();
  }

  get showLocalAxes()
  {
    return this._showLocalAxes;
  }

  set showLocalAxes(enabled)
  {
    this._showLocalAxes = enabled;
    this.setItem("showLocalAxes", enabled);
    this.application.updateSelection();
  }

  get shadowsEnabled()
  {
    return this._shadowsEnabled;
  }

  set shadowsEnabled(enabled)
  {
    this._shadowsEnabled = enabled;
    this.setItem("shadowsEnabled", enabled);
    this.application.setShadowMapEnabled(enabled);
  }

  applyBackground()
  {
    if (this._backgroundColor1 === this._backgroundColor2)
    {
      this.application.container.style.background = this._backgroundColor1;
    }
    else
    {
      this.application.container.style.background = "linear-gradient(" +
        this._backgroundColor1 + "," + this._backgroundColor2 + ")";
    }
  }

  restoreBackground()
  {
    this._backgroundColor1 = this.getItem("backgroundColor1");
    if (this._backgroundColor1 === null)
      this._backgroundColor1 = "#E0E0FF";

    this._backgroundColor2 = this.getItem("backgroundColor2");
    if (this._backgroundColor2 === null)
      this._backgroundColor2 = "#E0F0E0";
  }

  saveBackground()
  {
    this.setItem("backgroundColor1", this._backgroundColor1);
    this.setItem("backgroundColor2", this._backgroundColor2);
  }

  getItem(name)
  {
    return window.localStorage.getItem(Setup.PREFIX + name);
  }

  setItem(name, value)
  {
    window.localStorage.setItem(Setup.PREFIX + name, value);
  }
}

export { Setup };


