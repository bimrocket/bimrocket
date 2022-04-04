/**
 * Formula.js
 *
 * @author realor
 */

import { ObjectUtils } from "../utils/ObjectUtils.js";

class Formula
{
  /* Formula contructor: new Formula("position.x", "position.y + 1") */
  constructor(path, expression)
  {
    this.path = path;
    this.expression = expression;
    this.getFn = new Function("object", "return object." + path);
    this.setFn = ObjectUtils.createEvalFunction(
      "object." + path + "=" + expression);
  }

  evaluate(object)
  {
    return this.setFn(object);
  }

  /* static methods */

  static create(object, path, expression, evaluate = true)
  {
    if (object.formulas === undefined)
    {
      object.formulas = {};
    }
    const formula = new Formula(path, expression);
    if (evaluate) formula.evaluate(object);

    object.formulas[path] = formula;
    return formula;
  }

  static set(object, formula, evaluate = true)
  {
    if (object.formulas === undefined)
    {
      object.formulas = {};
    }
    if (evaluate) formula.evaluate(object);

    object.formulas[formula.path] = formula;
    return formula;
  }

  static get(object, path)
  {
    if (object.formulas)
    {
      return object.formulas[path];
    }
  }

  static getAll(object)
  {
    return object.formulas;
  }

  static remove(object, path)
  {
    if (object.formulas)
    {
      if (path)
      {
        delete object.formulas[path];
      }
      else
      {
        object.formulas = {};
      }
    }
  }

  static isDefined(object, path = "")
  {
    if (object.formulas)
    {
      for (let key in object.formulas)
      {
        if (key.startsWith(path))
        {
          return true;
        }
      }
    }
    return false;
  }

  static eval(object, path)
  {
    if (object.formulas)
    {
      const formula = object.formulas[path];
      if (formula)
      {
        return formula.evaluate(object);
      }
    }
  }

  static update(object, path = "", prefix = path === "" ? true : false)
  {
    let updated = false;

    if (object.formulas)
    {
      if (prefix)
      {
        const formulas = object.formulas;
        for (let key in formulas)
        {
          if (key.startsWith(path))
          {
            let formula = formulas[key];
            const oldValue = formula.getFn(object);
            const newValue = formula.setFn(object);
            updated = updated || oldValue !== newValue;
          }
        }
      }
      else
      {
        const formula = object.formulas[path];
        if (formula)
        {
          const oldValue = formula.getFn(object);
          const newValue = formula.setFn(object);
          updated = oldValue !== newValue;
        }
      }
    }
    return updated;
  }

  static updateTree(object, path = "", prefix = path === "" ? true : false)
  {
    const updatedObjects = [];

    const updateFormulas = object =>
    {
      if (Formula.update(object, path, prefix))
      {
        updatedObjects.push(object);
      }

      for (let child of object.children)
      {
        updateFormulas(child);
      }
    };

    updateFormulas(object);

    return updatedObjects;
  }

  static copy(target, source)
  {
    if (target.formulas === undefined)
    {
      target.formulas = {};
    }

    const targetFormulas = target.formulas;
    const sourceFormulas = source.formulas;
    for (let path in sourceFormulas)
    {
      targetFormulas[path] = sourceFormulas[path];
    }
  }
}

export { Formula };

