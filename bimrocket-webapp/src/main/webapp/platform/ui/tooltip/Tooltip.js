/**
 * Tooltip.js
 *
 * @author realor
 */

class Tooltip
{
  static delay = 400;
  static margin = 8;
  static gap = 8;

  static _node = null;
  static _target = null;
  static _timer = null;
  static _enabled = false;

  static enable()
  {
    if (this._enabled) return;

    this._enabled = true;

    this._node = document.createElement("div");
    this._node.className = "tooltip";
    this._node.setAttribute("role", "tooltip");
    this._node.id = "global-tooltip";

    document.body.append(this._node);

    document.addEventListener("pointerover", this._onPointerOver);
    document.addEventListener("focusin", this._onFocusIn);
    document.addEventListener("focusout", this._onFocusOut);

    window.addEventListener("scroll", this._onViewportChange, true);
    window.addEventListener("resize", this._onViewportChange);
  }

  static disable()
  {
    if (!this._enabled) return;

    this._enabled = false;

    document.removeEventListener("pointerover", this._onPointerOver);
    document.removeEventListener("focusin", this._onFocusIn);
    document.removeEventListener("focusout", this._onFocusOut);

    window.removeEventListener("scroll", this._onViewportChange, true);
    window.removeEventListener("resize", this._onViewportChange);

    clearTimeout(this._timer);

    this._node.remove();
    this._node = null;
    this._target = null;
    this._timer = null;
  }

  static _onPointerOver = event =>
  {
    if (event.pointerType === "touch") return;

    const target = event.target.closest?.("[data-tooltip]");
    if (!target && this._target)
    {
      this._hide();
      return;
    }

    clearTimeout(this._timer);

    if (this._target === target) return;

    this._timer = setTimeout(() =>
    {
      this._show(target);
    }, this.delay);
  };

  static _onFocusIn = event =>
  {
    // ignore for touch devices
    if (navigator.maxTouchPoints > 0) return;

    const target = event.target.closest?.("[data-tooltip]");
    if (!target) return;

    clearTimeout(this._timer);

    this._show(target);
  };

  static _onFocusOut = event =>
  {
    if (this._target?.contains(event.target))
    {
      this._hide();
    }
  };

  static _onViewportChange = () =>
  {
    this._updatePosition();
  };

  static _show(target)
  {
    clearTimeout(this._timer);

    this._target = target;

    this._node.textContent = target.dataset.tooltip;
    this._node.setAttribute("aria-hidden", "false");

    target.setAttribute("aria-describedby", this._node.id);

    this._updatePosition();
  }

  static _hide()
  {
    clearTimeout(this._timer);

    if (this._target?.getAttribute("aria-describedby") === this._node.id)
    {
      this._target.removeAttribute("aria-describedby");
    }

    this._node.setAttribute("aria-hidden", "true");
    this._target = null;
  }

  static _updatePosition()
  {
    if (!this._target) return;

    const rect = this._target.getBoundingClientRect();
    const node = this._node;

    const width = node.offsetWidth;
    const height = node.offsetHeight;

    let x = rect.left + rect.width / 2 - width / 2;
    let y = rect.top - height - this.gap;
    let bottom = false;

    if (y < this.margin)
    {
      y = rect.bottom + this.gap;
      bottom = true;
    }

    x = Math.max(this.margin,
      Math.min(x, window.innerWidth - width - this.margin));

    node.classList.toggle("bottom", bottom);
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
  }
}

export { Tooltip };