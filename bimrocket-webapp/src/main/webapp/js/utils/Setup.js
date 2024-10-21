/**
 * Setup.js
 *
 * @author realor
 */

import { Application } from "../ui/Application.js";

class Setup
{
  static PREFIX = "bimrocket.";
  static LANGUAGE = "language";
  static UNITS = "units";
  static DECIMALS = "decimals";
  static BACKGROUND_COLOR_1 = "backgroundColor1";
  static BACKGROUND_COLOR_2 = "backgroundColor2";
  static PANEL_OPACITY = "panelOpacity";
  static FAST_RENDERING_FPS = "fastRenderingFPS";
  static SELECTION_PAINT_MODE = "selectionPaintMode";
  static SHADOWS_ENABLED = "shadowsEnabled";
  static SHOW_DEEP_SELECTION = "showDeepSelection";
  static SHOW_LOCAL_AXES = "showLocalAxes";
  static AO_ENABLED = "aoEnabled";
  static AO_INTENSITY = "aoIntensity";

  constructor(application)
  {
    this.application = application;

    // restore setup from localStorage

    this._userLanguage = this.getItem(Setup.LANGUAGE) || navigator.language;

    this._units = this.getItem(Setup.UNITS) || "m";

    this._decimals = parseInt(this.getItem(Setup.DECIMALS) || "2");

    this.restoreBackground();

    let opacityValue = this.getItem(Setup.PANEL_OPACITY);
    this._panelOpacity = opacityValue ? parseFloat(opacityValue) : 0.8;

    let fps = this.getItem(Setup.FAST_RENDERING_FPS);
    this._fastRenderingFPS = fps ? parseInt(fps) : 15;

    this._selectionPaintMode =
      this.getItem(Setup.SELECTION_PAINT_MODE) || Application.EDGES_SELECTION;

    this._shadowsEnabled = this.getItem(Setup.SHADOWS_ENABLED) === "true";

    this._showDeepSelection = this.getItem(Setup.SHOW_DEEP_SELECTION) !== "false";

    this._showLocalAxes = this.getItem(Setup.SHOW_LOCAL_AXES) !== "false";

    this._ambientOcclusionEnabled = this.getItem(Setup.AO_ENABLED) === "true";

    this._ambientOcclusionIntensity = parseFloat(this.getItem(Setup.AO_INTENSITY) || "0.3");
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
    this.setItem(Setup.LANGUAGE, userLanguage);
  }

  get units()
  {
    return this._units;
  }

  set units(units)
  {
    this._units = units;
    this.setItem(Setup.UNITS, units);
  }

  get decimals()
  {
    return this._decimals;
  }

  set decimals(decimals)
  {
    this._decimals = decimals;
    this.setItem(Setup.DECIMALS, String(decimals));
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
    this.setItem(Setup.PANEL_OPACITY, String(opacity));
    let panels = this.application.panelManager.getPanels();
    for (let panel of panels)
    {
      panel.opacity = opacity;
    }
  }

  get fastRenderingFPS()
  {
    return this._fastRenderingFPS;
  }

  set fastRenderingFPS(fps)
  {
    this._fastRenderingFPS = fps;
    this.setItem(Setup.FAST_RENDERING_FPS, String(fps));
  }

  get selectionPaintMode()
  {
    return this._selectionPaintMode;
  }

  set selectionPaintMode(selMode)
  {
    this._selectionPaintMode = selMode;
    this.setItem(Setup.SELECTION_PAINT_MODE, selMode);
  }

  get showDeepSelection()
  {
    return this._showDeepSelection;
  }

  set showDeepSelection(enabled)
  {
    this._showDeepSelection = enabled;
    this.setItem(Setup.SHOW_DEEP_SELECTION, enabled);
    this.application.updateSelection();
  }

  get showLocalAxes()
  {
    return this._showLocalAxes;
  }

  set showLocalAxes(enabled)
  {
    this._showLocalAxes = enabled;
    this.setItem(Setup.SHOW_LOCAL_AXES, enabled);
    this.application.updateSelection();
  }

  get shadowsEnabled()
  {
    return this._shadowsEnabled;
  }

  set shadowsEnabled(enabled)
  {
    this._shadowsEnabled = enabled;
    this.setItem(Setup.SHADOWS_ENABLED, enabled);
    this.application.setShadowMapEnabled(enabled);
  }

  get ambientOcclusionEnabled()
  {
    return this._ambientOcclusionEnabled;
  }

  set ambientOcclusionEnabled(enabled)
  {
    this._ambientOcclusionEnabled = enabled;
    this.setItem(Setup.AO_ENABLED, enabled);
    this.application.setupComposer();
    this.application.repaint();
  }

  get ambientOcclusionIntensity()
  {
    return this._ambientOcclusionIntensity;
  }

  set ambientOcclusionIntensity(intensity)
  {
    this._ambientOcclusionIntensity = intensity;
    this.setItem(Setup.AO_INTENSITY, String(intensity));
    this.application.ambientOcclusionParams.saoIntensity = intensity;
    this.application.repaint();
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
    this._backgroundColor1 = this.getItem(Setup.BACKGROUND_COLOR_1);
    if (this._backgroundColor1 === null)
      this._backgroundColor1 = "#E0E0FF";

    this._backgroundColor2 = this.getItem(Setup.BACKGROUND_COLOR_2);
    if (this._backgroundColor2 === null)
      this._backgroundColor2 = "#E0F0E0";
  }

  saveBackground()
  {
    this.setItem(Setup.BACKGROUND_COLOR_1, this._backgroundColor1);
    this.setItem(Setup.BACKGROUND_COLOR_2, this._backgroundColor2);
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


