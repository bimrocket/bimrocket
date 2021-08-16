/**
 * FakeRenderer.js
 *
 * @author realor
 */

class FakeRenderer
{
  constructor()
  {
    this.domElement = document.createElement("canvas");
  }

  setClearColor(color)
  {
  }

  setPixelRatio(ratio)
  {
  }

  setSize(width, height)
  {
    this.domElement.width = width;
    this.domElement.height = height;
  }

  render()
  {
    const ctx = this.domElement.getContext("2d");
    ctx.font = "16px Arial";
    ctx.fillStyle = "#ff0000";
    ctx.fillText("WebGL is not supported!", 8, 24);
  }
}

export { FakeRenderer }

