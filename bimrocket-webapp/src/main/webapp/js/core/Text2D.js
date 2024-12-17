/*
 * Text2D.js
 *
 * @author realor
 */

import { CSS2DObject } from "../renderers/CSS2DRenderer.js";

class Text2D extends CSS2DObject
{
  constructor()
  {
    super();
    this.type = "Text2D";
    this.text = "Text";
    this.element.style.color = "rgb(0,0,0)";
    this.element.style.padding = "1px";
    this.element.style.textAlign = "center";
  }

  set text(text)
  {
    this.element.textContent = text;
  }

  get text()
  {
    return this.element.textContent;
  }

  set color(color)
  {
    this.element.style.color = color;
  }

  get color()
  {
    return this.element.style.color;
  }

  set backgroundColor(color)
  {
    this.element.style.backgroundColor = color;
  }

  get backgroundColor()
  {
    return this.element.style.backgroundColor;
  }

  set fontSize(size)
  {
    this.element.style.fontSize = size;
  }

  get fontSize()
  {
    return this.element.style.fontSize;
  }

  set maxWidth(width)
  {
    this.element.style.maxWidth = width;
  }

  get maxWidth()
  {
    return this.element.style.maxWidth;
  }
}

export { Text2D };