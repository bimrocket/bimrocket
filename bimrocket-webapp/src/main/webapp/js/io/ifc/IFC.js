/**
 * IFC.js
 *
 * @author realor
 */

class IFC
{
  static RepresentationName = "IfcRepresentation";

  static FACTOR_PREFIX =
  {
    ".EXA." : 10e17,
    ".PETA." : 10e14,
    ".TERA." : 10e11,
    ".GIGA." : 10e8,
    ".MEGA." : 10e5,
    ".KILO." : 10e2,
    ".HECTO." : 100,
    ".DECA." : 10,
    ".DECI." : 0.1,
    ".CENTI." : 0.01,
    ".MILLI." : 0.001,
    ".MICRO." : 10e-7,
    ".NANO." : 10e-10,
    ".PICO." : 10e-13,
    ".FEMTO." : 10e-16,
    ".ATTO." : 10e-19
  };
}

export { IFC };
