/*
 * UI.js
 *
 * @author realor
 */

class UI
{
  static create(template)
  {
    const template = document.createElement("template");

    template.innerHTML = template;

    const ui = {};

    let elements = template.querySelector("[data-id]");
    for (let element of elements)
    {
      ui[element.dataset.id] = element;
    }
    return ui;
  }
}

/*
    const ui = UI.create(`
      <div class="progressbar">

        <div data-id="message" class="message"></div>

        <div data-id="bar" class="bar">
          <div data-id="done" class="done"></div>
        </div>

        <div data-id="progress">
          <span data-id="percent"></span>
          <span data-id="remainingLabel"></span>
          <span data-id="remainingTime"></span>
        </div>
      </div>
    `);

 */

export { UI };