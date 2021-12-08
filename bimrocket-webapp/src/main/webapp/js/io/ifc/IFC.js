/**
 * IFC.js
 *
 * @author realor
 */

class IFC
{
  static RepresentationName = "IfcRepresentation";

  static UNIT_PREFIXES =
  {
    ".EXA." : { symbol: "E", factor : 10e17 },
    ".PETA." : { symbol : "P", factor: 10e14 },
    ".TERA." : { symbol : "T", factor : 10e11 },
    ".GIGA." : { symbol : "G", factor : 10e8 },
    ".MEGA." : { symbol : "M", factor : 10e5 },
    ".KILO." : { symbol : "k", factor : 10e2 },
    ".HECTO." : { sybol : "h", factor : 100 },
    ".DECA." : { symbol : "da", factor : 10 },
    ".DECI." : { symbol : "d", factor : 0.1 },
    ".CENTI." : { symbol : "c", factor : 0.01 },
    ".MILLI." : { symbol : "m", factor : 0.001 },
    ".MICRO." : { symbol : "u", factor : 10e-7 },
    ".NANO." : { symbol : "n", factor : 10e-10 },
    ".PICO." : { symbol : "p", factor : 10e-13 },
    ".FEMTO." : { symbol : "f", factor : 10e-16 },
    ".ATTO." : { symbol : "a", factor : 10e-19 }
  };
}

export { IFC };
