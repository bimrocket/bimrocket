/**
 * Action.js
 *
 * @author realor
 */

class Action
{
  constructor()
  {
  }

  getLabel()
  {
    return this.constructor.name;
  }

  getClassName()
  {
    return "action";
  }

  isEnabled()
  {
    return true;
  }

  perform()
  {
    console.info("Perform " + this.contructor.name);
  }
}

export { Action };
