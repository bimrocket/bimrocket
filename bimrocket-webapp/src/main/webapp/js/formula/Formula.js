/**
 * Formula.js
 *
 * @author realor
 */

class Formula
{
  /* Formula contructor: new Formula("position.x", "position.y + 1") */
  constructor(path, expression)
  {
    this.path = path;
    this.expression = expression;
    this.getFn = new Function("object", "return object." + path);
    this.setFn = new Function("object", "position", "rotation", "scale",
      "material", "userData", "builder", "controllers",
      "return object." + path + "=" + expression);
  }

  evaluate(object)
  {
    return this.setFn(object, object.position, object.rotation, object.scale,
      object.material, object.userData, object.builder, object.controllers);
  }

  /* static methods */

  static set(object, path, expression, evaluate = true)
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

  static update(object, path)
  {
    let updated = false;

    if (object.formulas)
    {
      if (path)
      {
        const formula = object.formulas[path];
        if (formula)
        {
          const oldValue = formula.getFn(object);
          const newValue = formula.evaluate(object);
          updated = oldValue !== newValue;
        }
      }
      else
      {
        const formulas = object.formulas;
        for (let path in formulas)
        {
          let formula = formulas[path];
          const oldValue = formula.getFn(object);
          const newValue = formula.evaluate(object);
          updated = updated || oldValue !== newValue;
        }
      }
    }
    return updated;
  }
}

export { Formula };

